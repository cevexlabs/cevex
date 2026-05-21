import { shake256, keccak_256 } from '@noble/hashes/sha3'
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa'
import { Contract, JsonRpcProvider, Wallet, getAddress, keccak256, toUtf8Bytes } from 'ethers'
import { randomBytes } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { loadEnv, normalizePrivateKey, requiredEnv } from './lib/env.mjs'
import { installErrorHandler, panel, spacer } from './lib/ui.mjs'

installErrorHandler()

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptsDir, '..')
const artifactPath = join(root, 'build', 'CevexRegistry.json')
const deploymentsDir = join(root, 'deployments')
const deploymentPath = join(deploymentsDir, 'base-sepolia.json')
const demoPath = join(deploymentsDir, 'base-sepolia-demo.json')

loadEnv(join(root, '.env'))

if (!existsSync(artifactPath)) {
  throw new Error('Missing build/CevexRegistry.json. Run npm run compile first.')
}

if (!existsSync(deploymentPath)) {
  throw new Error('Missing deployments/base-sepolia.json. Run npm run deploy:base-sepolia first.')
}

const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org'
const privateKey = normalizePrivateKey(requiredEnv('DEPLOYER_PRIVATE_KEY'))
const provider = new JsonRpcProvider(rpcUrl, { name: 'base-sepolia', chainId: 84532 })
const network = await provider.getNetwork()

if (network.chainId !== 84532n) {
  throw new Error(`Expected Base Sepolia chain id 84532, received ${network.chainId}.`)
}

const wallet = new Wallet(privateKey, provider)
const balance = await provider.getBalance(wallet.address)

if (balance === 0n) {
  throw new Error(`Deployer ${wallet.address} has zero Base Sepolia ETH.`)
}

const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'))
const deployment = JSON.parse(readFileSync(deploymentPath, 'utf8'))
const registry = new Contract(deployment.address, artifact.abi, wallet)

const seed = shake256(randomBytes(64), { dkLen: 32 })
const { publicKey } = ml_dsa65.keygen(seed)
const publicKeyHex = `0x${Buffer.from(publicKey).toString('hex')}`
const publicKeyHash = `0x${Buffer.from(shake256(publicKey, { dkLen: 32 })).toString('hex')}`
const agentAddress = deriveAgentAddress(publicKey)
const metadataHash = keccak256(toUtf8Bytes(JSON.stringify({
  demo: 'base-sepolia-agent-registration',
  scheme: 'ML-DSA-65',
  publicKeyHash,
})))

panel('LIVE DEMO START', [
  { label: 'Registry', value: deployment.address, status: true },
  { label: 'Agent', value: agentAddress },
  { label: 'Scheme', value: 'ML-DSA-65' },
  { label: 'Public key', value: `${publicKey.length} bytes` },
])
spacer()

const tx = await registry.registerAgent(publicKeyHex, 0, 3, metadataHash)
const receipt = await tx.wait()

const active = await registry.isActive(agentAddress)
const identity = await registry.getIdentity(agentAddress)
const [storedPublicKey, scheme, securityLevel, registeredAt, revokedAt, storedMetadataHash] = identity

if (!active) {
  throw new Error('Agent was registered but is not active.')
}

if (storedPublicKey.toLowerCase() !== publicKeyHex.toLowerCase()) {
  throw new Error('On-chain public key does not match the demo public key.')
}

const txUrl = `https://sepolia.basescan.org/tx/${tx.hash}`
const agentUrl = `https://sepolia.basescan.org/address/${agentAddress}`

const demo = {
  network: 'base-sepolia',
  chainId: 84532,
  registryAddress: deployment.address,
  agentAddress,
  scheme: Number(scheme),
  securityLevel: Number(securityLevel),
  active,
  registeredAt: Number(registeredAt),
  revokedAt: Number(revokedAt),
  publicKeyHash,
  metadataHash: storedMetadataHash,
  transactionHash: tx.hash,
  blockNumber: Number(receipt.blockNumber),
  gasUsed: receipt.gasUsed.toString(),
  demonstratedAt: new Date().toISOString(),
  explorer: {
    transaction: txUrl,
    agent: agentUrl,
    registry: deployment.explorer,
  },
}

mkdirSync(deploymentsDir, { recursive: true })
writeFileSync(demoPath, JSON.stringify(demo, null, 2) + '\n')

panel('LIVE DEMO OK', [
  { label: 'Status', value: 'agent registered and active', status: true },
  { label: 'Agent', value: agentAddress },
  { label: 'Tx', value: tx.hash },
  { label: 'Block', value: String(receipt.blockNumber) },
  { label: 'Saved', value: 'deployments/base-sepolia-demo.json' },
], [
  txUrl,
])

function deriveAgentAddress(publicKey) {
  const hash = keccak_256(publicKey)
  return getAddress(`0x${Buffer.from(hash.slice(12)).toString('hex')}`)
}
