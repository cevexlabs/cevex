import { ml_dsa65 } from '@noble/post-quantum/ml-dsa'
import { shake256, keccak_256 } from '@noble/hashes/sha3'
import { randomBytes } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const encoder = new TextEncoder()
const root = dirname(fileURLToPath(import.meta.url))
const artifactsDir = join(root, 'artifacts')

const files = {
  agentKey: join(artifactsDir, 'agent.key.json'),
  registry: join(artifactsDir, 'registry-record.json'),
  request: join(artifactsDir, 'transfer-request.json'),
  signed: join(artifactsDir, 'signed-transfer.json'),
  tampered: join(artifactsDir, 'tampered-transfer.json'),
}

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const RECIPIENT = '0x6fB3E0A217407EFFf7Ca062D46c26E5d60a14d69'
const ATTACKER = '0x000000000000000000000000000000000000dEaD'

const argv = process.argv.slice(2)
const command = (argv[0] ?? 'help').toLowerCase()
const options = parseOptions(argv.slice(1))

const toHex = bytes => Buffer.from(bytes).toString('hex')
const fromHex = hex => new Uint8Array(Buffer.from(hex, 'hex'))
const digestHex = bytes => toHex(shake256(bytes, { dkLen: 32 }))
const abbr = text => `${text.slice(0, 10)}...${text.slice(-8)}`
const isAddress = value => /^0x[0-9a-fA-F]{40}$/.test(String(value))

function parseOptions(args) {
  const parsed = {}
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (!arg.startsWith('--')) continue

    const key = arg.slice(2)
    const next = args[i + 1]
    if (!next || next.startsWith('--')) {
      parsed[key] = true
      continue
    }

    parsed[key] = next
    i += 1
  }
  return parsed
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return '[' + value.map(item => canonicalJson(item)).join(',') + ']'
  }

  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key =>
      JSON.stringify(key) + ':' + canonicalJson(value[key])
    ).join(',') + '}'
  }

  return JSON.stringify(value)
}

function encodeAction(action) {
  return encoder.encode(canonicalJson(action))
}

function deriveAddress(publicKey) {
  const hash = keccak_256(publicKey)
  const raw = toHex(hash.slice(12)).toLowerCase()
  const checksumHash = toHex(keccak_256(encoder.encode(raw)))

  let address = '0x'
  for (let i = 0; i < raw.length; i += 1) {
    address += parseInt(checksumHash[i], 16) >= 8 ? raw[i].toUpperCase() : raw[i]
  }
  return address
}

function buildSignedBytes({ agentAddress, nonce, timestamp, action }) {
  const prefix = encoder.encode('CEVEX-MSG-v1')
  const address = Buffer.from(agentAddress.slice(2), 'hex')
  const actionBytes = encodeAction(action)
  const buffer = new Uint8Array(prefix.length + 1 + 20 + 8 + 8 + 4 + actionBytes.length)
  let offset = 0

  buffer.set(prefix, offset)
  offset += prefix.length
  buffer[offset] = 0x01
  offset += 1
  buffer.set(address, offset)
  offset += 20

  const writeUint64 = value => {
    const n = BigInt(value)
    const hi = Number((n >> 32n) & 0xffffffffn)
    const lo = Number(n & 0xffffffffn)
    buffer[offset] = (hi >>> 24) & 0xff
    buffer[offset + 1] = (hi >>> 16) & 0xff
    buffer[offset + 2] = (hi >>> 8) & 0xff
    buffer[offset + 3] = hi & 0xff
    buffer[offset + 4] = (lo >>> 24) & 0xff
    buffer[offset + 5] = (lo >>> 16) & 0xff
    buffer[offset + 6] = (lo >>> 8) & 0xff
    buffer[offset + 7] = lo & 0xff
    offset += 8
  }

  writeUint64(nonce)
  writeUint64(timestamp)

  buffer[offset] = (actionBytes.length >>> 24) & 0xff
  buffer[offset + 1] = (actionBytes.length >>> 16) & 0xff
  buffer[offset + 2] = (actionBytes.length >>> 8) & 0xff
  buffer[offset + 3] = actionBytes.length & 0xff
  offset += 4

  buffer.set(actionBytes, offset)
  return buffer
}

function readJson(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}. Run node workflow.mjs init first.`)
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n')
}

function makeRequest(timestamp, input = {}) {
  const amount = String(input.amount ?? '1250.00')
  const token = String(input.token ?? 'USDC').toUpperCase()
  const recipient = String(input.recipient ?? RECIPIENT)
  const agentId = String(input.agent ?? 'treasury-agent-01')
  const agentRole = String(input.role ?? 'payment-approver')
  const policy = String(input.policy ?? 'allowlist-transfer-v1')
  const policyLimit = String(input.limit ?? '5000.00')
  const requestId = String(input.request ?? `pay-${timestamp.toString(36)}`)

  if (!isAddress(recipient)) {
    throw new Error(`Invalid recipient address: ${recipient}`)
  }

  return {
    version: 'cevex-transfer-request-v1',
    nonce: 17,
    timestamp,
    action: {
      requestId,
      source: 'ops-console',
      agentId,
      agentRole,
      type: 'erc20.transfer',
      network: 'base',
      chainId: 8453,
      token,
      tokenAddress: BASE_USDC,
      amount,
      recipient,
      policy,
      policyLimit,
      expiresAt: new Date(timestamp + 5 * 60_000).toISOString(),
    },
  }
}

function showHelp() {
  console.log('CEVEX file workflow demo')
  console.log()
  console.log('Run these in order:')
  console.log('  node workflow.mjs init')
  console.log(`  node workflow.mjs request --amount 2500.00 --recipient ${RECIPIENT}`)
  console.log('  node workflow.mjs sign')
  console.log('  node workflow.mjs verify')
  console.log('  node workflow.mjs tamper')
  console.log()
  console.log('Shortcut:')
  console.log('  node workflow.mjs all')
  console.log()
  console.log('Artifacts are written to examples/artifacts/.')
  console.log()
  console.log('Request options:')
  console.log('  --amount     Transfer amount, for example 2500.00')
  console.log('  --recipient  Destination address')
  console.log('  --agent      Agent ID')
  console.log('  --role       Agent role')
  console.log('  --policy     Policy ID')
  console.log('  --limit      Policy amount limit')
}

function init() {
  mkdirSync(artifactsDir, { recursive: true })

  const seed = shake256(randomBytes(64), { dkLen: 32 })
  const { publicKey, secretKey } = ml_dsa65.keygen(seed)
  const agentAddress = deriveAddress(publicKey)
  const timestamp = Date.now()

  writeJson(files.agentKey, {
    version: 'cevex-demo-key-v1',
    warning: 'Demo key only. Do not use this file in production.',
    agentAddress,
    scheme: 'ML-DSA-65',
    publicKey: toHex(publicKey),
    secretKey: toHex(secretKey),
  })

  writeJson(files.registry, {
    version: 'cevex-demo-registry-v1',
    network: 'offline',
    agentAddress,
    scheme: 'ML-DSA-65',
    active: true,
    publicKey: toHex(publicKey),
    publicKeyHash: digestHex(publicKey),
  })

  writeJson(files.request, makeRequest(timestamp, options))

  console.log('INIT OK')
  console.log(`agent:   ${agentAddress}`)
  console.log(`key:     ${files.agentKey}`)
  console.log(`registry:${files.registry}`)
  console.log(`request: ${files.request}`)
  console.log()
  console.log(`Next: node workflow.mjs request --amount 2500.00 --recipient ${RECIPIENT}`)
  console.log('Or:   node workflow.mjs sign')
}

function request() {
  mkdirSync(artifactsDir, { recursive: true })

  const timestamp = Date.now()
  const requestFile = makeRequest(timestamp, options)
  writeJson(files.request, requestFile)

  console.log('REQUEST OK')
  console.log(`request:   ${requestFile.action.requestId}`)
  console.log(`agent:     ${requestFile.action.agentId}`)
  console.log(`action:    ${requestFile.action.amount} ${requestFile.action.token} to ${abbr(requestFile.action.recipient)}`)
  console.log(`policy:    ${requestFile.action.policy} limit ${requestFile.action.policyLimit}`)
  console.log(`output:    ${files.request}`)
  console.log()
  console.log('Next: node workflow.mjs sign')
}

function sign() {
  const agentKey = readJson(files.agentKey)
  const request = readJson(files.request)
  const secretKey = fromHex(agentKey.secretKey)

  const signedBytes = buildSignedBytes({
    agentAddress: agentKey.agentAddress,
    nonce: request.nonce,
    timestamp: request.timestamp,
    action: request.action,
  })
  const signature = ml_dsa65.sign(secretKey, signedBytes)

  writeJson(files.signed, {
    version: 'cevex-signed-message-v1',
    protocol: 'CEVEX-MSG-v1',
    agentAddress: agentKey.agentAddress,
    scheme: agentKey.scheme,
    nonce: request.nonce,
    timestamp: request.timestamp,
    action: request.action,
    actionHash: digestHex(encodeAction(request.action)),
    signedBytesHash: digestHex(signedBytes),
    signature: toHex(signature),
  })

  console.log('SIGN OK')
  console.log(`request:   ${request.action.requestId}`)
  console.log(`action:    ${request.action.amount} ${request.action.token} to ${abbr(request.action.recipient)}`)
  console.log(`signature: ${abbr(toHex(signature))}`)
  console.log(`output:    ${files.signed}`)
  console.log()
  console.log('Next: node workflow.mjs verify')
}

function verifyFile(path) {
  const registry = readJson(files.registry)
  const signed = readJson(path)

  if (!registry.active) {
    return { valid: false, reason: 'registry record inactive', signed }
  }

  if (registry.agentAddress.toLowerCase() !== signed.agentAddress.toLowerCase()) {
    return { valid: false, reason: 'agent address mismatch', signed }
  }

  const signedBytes = buildSignedBytes({
    agentAddress: signed.agentAddress,
    nonce: signed.nonce,
    timestamp: signed.timestamp,
    action: signed.action,
  })

  const publicKey = fromHex(registry.publicKey)
  const signature = fromHex(signed.signature)
  const valid = ml_dsa65.verify(publicKey, signedBytes, signature)
  return {
    valid,
    reason: valid ? 'signature valid' : 'signature rejected',
    signed,
    signedBytesHash: digestHex(signedBytes),
  }
}

function verify(path = files.signed) {
  const result = verifyFile(path)

  console.log(result.valid ? 'VERIFY PASS' : 'VERIFY FAIL')
  console.log(`file:      ${path}`)
  console.log(`agent:     ${result.signed.agentAddress}`)
  console.log(`request:   ${result.signed.action.requestId}`)
  console.log(`action:    ${result.signed.action.amount} ${result.signed.action.token} to ${abbr(result.signed.action.recipient)}`)
  console.log(`check:     ${result.reason}`)
  console.log(`hash:      ${abbr(result.signedBytesHash ?? '')}`)

  if (!result.valid) process.exitCode = 1
}

function tamper() {
  const signed = readJson(files.signed)
  const tampered = JSON.parse(JSON.stringify(signed))
  tampered.action.amount = '125000.00'
  tampered.action.recipient = ATTACKER
  tampered.action.note = 'modified after signing'
  writeJson(files.tampered, tampered)

  const result = verifyFile(files.tampered)

  console.log(result.valid ? 'TAMPER FAIL' : 'TAMPER PASS')
  console.log(`file:      ${files.tampered}`)
  console.log(`amount:    ${tampered.action.amount}`)
  console.log(`recipient: ${abbr(tampered.action.recipient)}`)
  console.log(`check:     ${result.reason}`)
  console.log()
  console.log(result.valid
    ? 'The modified request was accepted, which should not happen.'
    : 'The modified request was rejected as expected.')

  if (result.valid) process.exitCode = 1
}

function all() {
  init()
  console.log()
  request()
  console.log()
  sign()
  console.log()
  verify()
  console.log()
  tamper()
}

try {
  if (command === 'help') showHelp()
  else if (command === 'init') init()
  else if (command === 'request') request()
  else if (command === 'sign') sign()
  else if (command === 'verify') {
    const fileIndex = argv.indexOf('--file')
    if (fileIndex >= 0 && !argv[fileIndex + 1]) {
      throw new Error('Missing path after --file.')
    }
    const path = fileIndex >= 0 ? resolve(process.cwd(), argv[fileIndex + 1]) : files.signed
    verify(path)
  } else if (command === 'tamper') tamper()
  else if (command === 'all') all()
  else {
    console.error(`Unknown command: ${command}`)
    console.error('Run node workflow.mjs help')
    process.exit(1)
  }
} catch (err) {
  console.error(`ERROR: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
}
