import { JsonRpcProvider, Wallet, ContractFactory, formatEther } from 'ethers'
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
const force = process.argv.includes('--force')

loadEnv(join(root, '.env'))

if (!existsSync(artifactPath)) {
  throw new Error('Missing build/CevexRegistry.json. Run npm run compile first.')
}

if (existsSync(deploymentPath) && !force) {
  const existing = JSON.parse(readFileSync(deploymentPath, 'utf8'))
  panel('DEPLOYMENT FOUND', [
    { label: 'Network', value: existing.network, status: true },
    { label: 'Registry', value: existing.address },
    { label: 'Explorer', value: existing.explorer },
  ], [
    'Use npm run deploy:base-sepolia -- --force to deploy a new registry.',
  ])
  process.exit(0)
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

panel('DEPLOY START', [
  { label: 'Network', value: 'base-sepolia', status: true },
  { label: 'Chain ID', value: '84532' },
  { label: 'Deployer', value: wallet.address },
  { label: 'Balance', value: `${formatEther(balance)} ETH` },
])
spacer()

const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet)
const registry = await factory.deploy()
const deployTx = registry.deploymentTransaction()

if (!deployTx) {
  throw new Error('Deployment transaction was not created.')
}

const receipt = await deployTx.wait()
const address = await registry.getAddress()
const explorer = `https://sepolia.basescan.org/address/${address}`

const deployment = {
  network: 'base-sepolia',
  chainId: 84532,
  contract: 'CevexRegistry',
  address,
  deployer: wallet.address,
  transactionHash: deployTx.hash,
  blockNumber: Number(receipt.blockNumber),
  gasUsed: receipt.gasUsed.toString(),
  deployedAt: new Date().toISOString(),
  explorer,
}

mkdirSync(deploymentsDir, { recursive: true })
writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2) + '\n')

panel('DEPLOY OK', [
  { label: 'Registry', value: address, status: true },
  { label: 'Tx', value: deployTx.hash },
  { label: 'Block', value: String(receipt.blockNumber) },
  { label: 'Gas used', value: receipt.gasUsed.toString() },
  { label: 'Saved', value: 'deployments/base-sepolia.json' },
], [
  explorer,
])
