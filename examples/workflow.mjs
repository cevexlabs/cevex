import { ml_dsa65 } from '@noble/post-quantum/ml-dsa'
import { shake256, keccak_256 } from '@noble/hashes/sha3'
import { randomBytes } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, relative, resolve } from 'path'
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

const colorEnabled = (process.stdout.isTTY || options.color) &&
  !options['no-color'] &&
  !process.env.NO_COLOR

const palette = {
  line: '#3d8bff',
  text: '#eff6ff',
  muted: '#8bafc8',
  soft: '#90aaff',
  success: '#5ab4ff',
  danger: '#cf2e2e',
}

function hexToRgb(hex) {
  const value = hex.replace('#', '')
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ]
}

function fg(hex) {
  const [r, g, b] = hexToRgb(hex)
  return text => colorEnabled ? `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m` : text
}

const ansi = code => text => colorEnabled ? `\x1b[${code}m${text}\x1b[0m` : text
const theme = {
  line: fg(palette.line),
  text: fg(palette.text),
  muted: fg(palette.muted),
  soft: fg(palette.soft),
  success: fg(palette.success),
  danger: fg(palette.danger),
  bold: ansi('1'),
}

const box = options.ascii
  ? { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|', l: '+', r: '+', x: '+' }
  : { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│', l: '├', r: '┤', x: '┼' }

const stripAnsi = text => String(text).replace(/\x1b\[[0-9;]*m/g, '')
const visibleLength = text => stripAnsi(text).length
const WIDTH = Math.max(82, Math.min(112, (process.stdout.columns || 104) - 2))
const LABEL_W = 12
const VALUE_W = WIDTH - LABEL_W - 7
let printedPanels = 0

function clip(text, width) {
  const clean = stripAnsi(text)
  if (clean.length <= width) return clean
  if (width <= 3) return clean.slice(0, width)
  return clean.slice(0, width - 3) + '...'
}

function pad(text, width) {
  return text + ' '.repeat(Math.max(0, width - visibleLength(text)))
}

function cell(text, width, style = value => value) {
  return pad(style(clip(String(text), width)), width)
}

function panelTop(title) {
  const styled = theme.bold(title)
  const clean = stripAnsi(styled)
  const fill = Math.max(1, WIDTH - clean.length - 4)
  return theme.line(box.tl + box.h + ' ') + styled + theme.line(' ' + box.h.repeat(fill) + box.tr)
}

function panelRule() {
  return theme.line(
    box.l +
    box.h.repeat(LABEL_W + 2) +
    box.x +
    box.h.repeat(VALUE_W + 2) +
    box.r,
  )
}

function panelBottom() {
  return theme.line(box.bl + box.h.repeat(WIDTH - 2) + box.br)
}

function panelRow(label, value, valueStyle = theme.text) {
  return theme.line(box.v) + ' ' +
    cell(label, LABEL_W, theme.muted) + ' ' +
    theme.line(box.v) + ' ' +
    cell(value, VALUE_W, valueStyle) + ' ' +
    theme.line(box.v)
}

function messageRow(text, style = theme.soft) {
  return theme.line(box.v) + ' ' + cell(text, WIDTH - 4, style) + ' ' + theme.line(box.v)
}

function printPanel(title, rows, messages = []) {
  if (printedPanels > 0) console.log()
  console.log(panelTop(title))
  if (rows.length > 0) {
    console.log(panelRule())
    for (const row of rows) {
      console.log(panelRow(row.label, row.value, row.style ?? theme.text))
    }
  }
  if (messages.length > 0) {
    console.log(panelRule())
    for (const message of messages) {
      console.log(messageRow(message.text ?? message, message.style ?? theme.soft))
    }
  }
  console.log(panelBottom())
  printedPanels += 1
}

function displayPath(path) {
  const shown = path.startsWith(root) ? relative(root, path) : path
  return shown.replace(/\\/g, '/')
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
  printPanel('CEVEX Local Workflow', [
    { label: 'Purpose', value: 'step-by-step local signing workflow' },
    { label: 'Network', value: 'offline authorization flow with Base-shaped request' },
    { label: 'Artifacts', value: 'examples/artifacts/' },
  ], [
    'Run node workflow.mjs init, request, sign, verify, tamper',
    'Shortcut: node workflow.mjs all',
  ])

  printPanel('Commands', [
    { label: '1', value: 'node workflow.mjs init' },
    { label: '2', value: `node workflow.mjs request --amount 2500.00 --recipient ${RECIPIENT}` },
    { label: '3', value: 'node workflow.mjs sign' },
    { label: '4', value: 'node workflow.mjs verify' },
    { label: '5', value: 'node workflow.mjs tamper' },
  ])

  printPanel('Request Options', [
    { label: 'amount', value: 'Transfer amount, for example 2500.00' },
    { label: 'recipient', value: 'Destination EVM address' },
    { label: 'agent', value: 'Agent ID' },
    { label: 'role', value: 'Agent role' },
    { label: 'policy', value: 'Policy ID' },
    { label: 'limit', value: 'Policy amount limit' },
  ])
}

function printWorkflowBanner() {
  printPanel('CEVEX Transfer Authorization', [
    { label: 'Scenario', value: 'Base USDC transfer approval' },
    { label: 'Protocol', value: 'CEVEX-MSG-v1 with ML-DSA-65' },
    { label: 'Runtime', value: 'keygen, authorize, verify, integrity check' },
  ], [
    'Each step writes or reads JSON artifacts under examples/artifacts/.',
  ])
}

function init() {
  mkdirSync(artifactsDir, { recursive: true })

  const seed = shake256(randomBytes(64), { dkLen: 32 })
  const { publicKey, secretKey } = ml_dsa65.keygen(seed)
  const agentAddress = deriveAddress(publicKey)
  const timestamp = Date.now()

  writeJson(files.agentKey, {
    version: 'cevex-local-key-v1',
    warning: 'Local reference key only. Do not use this file in production.',
    agentAddress,
    scheme: 'ML-DSA-65',
    publicKey: toHex(publicKey),
    secretKey: toHex(secretKey),
  })

  writeJson(files.registry, {
    version: 'cevex-local-registry-v1',
    network: 'offline',
    agentAddress,
    scheme: 'ML-DSA-65',
    active: true,
    publicKey: toHex(publicKey),
    publicKeyHash: digestHex(publicKey),
  })

  writeJson(files.request, makeRequest(timestamp, options))

  printPanel('STEP 1 / PREPARE AGENT', [
    { label: 'Status', value: 'OK', style: theme.success },
    { label: 'Agent', value: agentAddress, style: theme.success },
    { label: 'Scheme', value: 'ML-DSA-65' },
    { label: 'Key', value: displayPath(files.agentKey) },
    { label: 'Registry', value: displayPath(files.registry) },
    { label: 'Request', value: displayPath(files.request) },
  ], [
    `Next: node workflow.mjs request --amount 2500.00 --recipient ${RECIPIENT}`,
    'Or: node workflow.mjs sign',
  ])
}

function request() {
  mkdirSync(artifactsDir, { recursive: true })

  const timestamp = Date.now()
  const requestFile = makeRequest(timestamp, options)
  writeJson(files.request, requestFile)

  printPanel('STEP 2 / CREATE REQUEST', [
    { label: 'Status', value: 'OK', style: theme.success },
    { label: 'Request', value: requestFile.action.requestId, style: theme.success },
    { label: 'Agent', value: requestFile.action.agentId },
    { label: 'Action', value: `${requestFile.action.amount} ${requestFile.action.token} to ${abbr(requestFile.action.recipient)}` },
    { label: 'Policy', value: `${requestFile.action.policy} limit ${requestFile.action.policyLimit}` },
    { label: 'Output', value: displayPath(files.request) },
  ], [
    'Next: node workflow.mjs sign',
  ])
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

  printPanel('STEP 3 / SIGN PAYLOAD', [
    { label: 'Status', value: 'OK', style: theme.success },
    { label: 'Request', value: request.action.requestId, style: theme.success },
    { label: 'Action', value: `${request.action.amount} ${request.action.token} to ${abbr(request.action.recipient)}` },
    { label: 'Input', value: displayPath(files.request) },
    { label: 'Hash', value: abbr(digestHex(signedBytes)) },
    { label: 'Signature', value: abbr(toHex(signature)) },
    { label: 'Output', value: displayPath(files.signed) },
  ], [
    'Next: node workflow.mjs verify',
  ])
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

  printPanel('STEP 4 / VERIFY SIGNATURE', [
    { label: 'Status', value: result.valid ? 'PASS' : 'FAIL', style: result.valid ? theme.success : theme.danger },
    { label: 'File', value: displayPath(path) },
    { label: 'Agent', value: result.signed.agentAddress },
    { label: 'Request', value: result.signed.action.requestId },
    { label: 'Action', value: `${result.signed.action.amount} ${result.signed.action.token} to ${abbr(result.signed.action.recipient)}` },
    { label: 'Check', value: result.reason, style: result.valid ? theme.success : theme.danger },
    { label: 'Hash', value: abbr(result.signedBytesHash ?? '') },
  ])

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

  printPanel('STEP 5 / TAMPER TEST', [
    { label: 'Status', value: result.valid ? 'FAIL' : 'PASS', style: result.valid ? theme.danger : theme.success },
    { label: 'File', value: displayPath(files.tampered) },
    { label: 'Amount', value: tampered.action.amount },
    { label: 'Recipient', value: abbr(tampered.action.recipient) },
    { label: 'Check', value: result.reason, style: result.valid ? theme.danger : theme.success },
  ], [
    result.valid
      ? { text: 'The modified request was accepted, which should not happen.', style: theme.danger }
      : { text: 'The modified request was rejected as expected.', style: theme.success },
  ])

  if (result.valid) process.exitCode = 1
}

function all() {
  printWorkflowBanner()
  init()
  request()
  sign()
  verify()
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
