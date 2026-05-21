import { ml_dsa65 } from '@noble/post-quantum/ml-dsa'
import { shake256, keccak_256 } from '@noble/hashes/sha3'
import { randomBytes } from 'crypto'
import { performance } from 'perf_hooks'

const argv = process.argv.slice(2)
const cmd = (argv.find(arg => !arg.startsWith('-')) ?? '').toLowerCase()
const jsonMode = argv.includes('--json')
const renderTerminal = !jsonMode
const asciiMode = argv.includes('--ascii')
const colorEnabled = (process.stdout.isTTY || argv.includes('--color')) &&
  !argv.includes('--no-color') &&
  renderTerminal &&
  !process.env.NO_COLOR

const hexToRgb = hex => {
  const value = hex.replace('#', '')
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ]
}
const fg = hex => {
  const [r, g, b] = hexToRgb(hex)
  return text => colorEnabled ? `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m` : text
}
const ansi = code => text => colorEnabled ? `\x1b[${code}m${text}\x1b[0m` : text
const palette = {
  base: '#0066ff',
  deep: '#003399',
  line: '#3d8bff',
  text: '#eff6ff',
  body: '#dbeafe',
  muted: '#8bafc8',
  soft: '#90aaff',
  glow: '#5ab4ff',
  danger: '#cf2e2e',
}
const theme = {
  blue: fg(palette.line),
  primary: fg(palette.base),
  deep: fg(palette.deep),
  cyan: fg(palette.glow),
  dim: fg(palette.muted),
  muted: fg(palette.soft),
  success: fg(palette.glow),
  danger: fg(palette.danger),
  white: fg(palette.text),
  body: fg(palette.body),
  bold: ansi('1'),
}

const identity = text => text
const stripAnsi = text => String(text).replace(/\x1b\[[0-9;]*m/g, '')
const visibleLength = text => stripAnsi(text).length
const terminalColumns = process.stdout.columns || 106
const WIDTH = Math.max(86, Math.min(116, terminalColumns - 2))
const FIELD_W = 14
const NOTE_W = Math.max(26, Math.min(34, Math.floor(WIDTH * 0.3)))
const VALUE_W = WIDTH - FIELD_W - NOTE_W - 10
const LABEL_W = 22
const COMMAND_W = WIDTH - LABEL_W - 7

const box = asciiMode
  ? { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|', l: '+', r: '+', t: '+', b: '+', x: '+' }
  : { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│', l: '├', r: '┤', t: '┬', b: '┴', x: '┼' }

function clip(text, width) {
  const clean = stripAnsi(text)
  if (clean.length <= width) return clean
  if (width <= 3) return clean.slice(0, width)
  return clean.slice(0, width - 3) + '...'
}

function padAnsi(text, width) {
  return text + ' '.repeat(Math.max(0, width - visibleLength(text)))
}

function cell(text, width, style = identity) {
  return padAnsi(style(clip(text, width)), width)
}

function center(text, width) {
  const clean = clip(text, width)
  const left = Math.max(0, Math.floor((width - clean.length) / 2))
  return ' '.repeat(left) + clean + ' '.repeat(Math.max(0, width - clean.length - left))
}

function line(char = '-') {
  const h = char === '-' ? box.h : char
  return theme.blue(box.tl + h.repeat(WIDTH - 2) + box.tr)
}

function titleLine(index, title, subtitle = '') {
  const badge = index ? theme.primary(index.padStart(2, '0')) + theme.blue(' / ') : ''
  const titleText = badge + theme.white(title)
  const cleanTitle = stripAnsi(titleText)
  const ruleWidth = Math.max(1, WIDTH - cleanTitle.length - 5)
  const top = theme.blue(box.tl + box.h + ' ') + titleText + theme.blue(' ' + box.h.repeat(ruleWidth) + box.tr)

  if (!subtitle) return top

  return [
    top,
    row(subtitle, theme.muted),
  ].join('\n')
}

function row(text = '', style = identity) {
  return theme.blue(box.v) + ' ' + cell(text, WIDTH - 4, style) + ' ' + theme.blue(box.v)
}

function tableRule(kind = 'mid') {
  const left = kind === 'top' ? box.tl : kind === 'bottom' ? box.bl : kind === 'left' ? box.l : box.l
  const right = kind === 'top' ? box.tr : kind === 'bottom' ? box.br : box.r
  const join = kind === 'top' ? box.t : kind === 'bottom' ? box.b : box.x
  return theme.blue(
    left +
    box.h.repeat(FIELD_W + 2) +
    join +
    box.h.repeat(VALUE_W + 2) +
    join +
    box.h.repeat(NOTE_W + 2) +
    right,
  )
}

function tableRow(field, value, note, valueStyle = theme.white, noteStyle = theme.muted) {
  return theme.blue(box.v) + ' ' +
    cell(field, FIELD_W, theme.dim) + ' ' +
    theme.blue(box.v) + ' ' +
    cell(value, VALUE_W, valueStyle) + ' ' +
    theme.blue(box.v) + ' ' +
    cell(note, NOTE_W, noteStyle) + ' ' +
    theme.blue(box.v)
}

function groupRule(label) {
  const text = ` ${label} `
  const leftWidth = FIELD_W + 2
  const valueWidth = VALUE_W + 2
  const noteWidth = NOTE_W + 2
  const clean = clip(text, Math.max(8, valueWidth - 2))

  return theme.blue(box.l + box.h.repeat(leftWidth) + box.x) +
    theme.primary(clean) +
    theme.blue(box.h.repeat(Math.max(0, valueWidth - clean.length)) + box.x + box.h.repeat(noteWidth) + box.r)
}

function section(index, title, subtitle, rows) {
  if (!renderTerminal) return
  console.log(titleLine(index, title, subtitle))
  console.log(tableRule())
  console.log(tableRow('Field', 'Value', 'Evidence', theme.bold, theme.bold))
  console.log(tableRule())
  for (const item of rows) {
    if (item === 'sep') {
      console.log(tableRule())
      continue
    }
    if (item.group) {
      console.log(groupRule(item.group))
      continue
    }
    console.log(tableRow(item.field, item.value, item.note, item.valueStyle, item.noteStyle))
  }
  console.log(tableRule('bottom'))
  console.log()
}

function commandRule(kind = 'mid') {
  const left = kind === 'bottom' ? box.bl : box.l
  const right = kind === 'bottom' ? box.br : box.r
  const join = kind === 'bottom' ? box.b : box.x
  return theme.blue(
    left +
    box.h.repeat(LABEL_W + 2) +
    join +
    box.h.repeat(COMMAND_W + 2) +
    right,
  )
}

function commandRow(label, command, labelStyle = theme.primary, commandStyle = theme.body) {
  return theme.blue(box.v) + ' ' +
    cell(label, LABEL_W, labelStyle) + ' ' +
    theme.blue(box.v) + ' ' +
    cell(command, COMMAND_W, commandStyle) + ' ' +
    theme.blue(box.v)
}

const WORDMARK = [
  '  ██████╗███████╗██╗   ██╗███████╗██╗  ██╗',
  ' ██╔════╝██╔════╝██║   ██║██╔════╝╚██╗██╔╝',
  ' ██║     █████╗  ██║   ██║█████╗   ╚███╔╝ ',
  ' ██║     ██╔══╝  ╚██╗ ██╔╝██╔══╝   ██╔██╗ ',
  ' ╚██████╗███████╗ ╚████╔╝ ███████╗██╔╝ ██╗',
  '  ╚═════╝╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝',
]

const ASCII_WORDMARK = [
  '   ____ _______     _______ __  __',
  '  / ___| ____\\ \\   / / ____| \\/ /',
  ' | |   |  _|  \\ \\ / /|  _|  \\  / ',
  ' | |___| |___  \\ V / | |___ /  \\ ',
  '  \\____|_____|  \\_/  |_____/_/\\_\\',
]

function showBanner() {
  if (!renderTerminal) return
  console.log()
  console.log(line())
  console.log(row())
  for (const logoLine of asciiMode ? ASCII_WORDMARK : WORDMARK) {
    console.log(row(center(logoLine, WIDTH - 4), theme.primary))
  }
  console.log(row())
  console.log(row(center('Post-quantum identity for autonomous AI agents', WIDTH - 4), theme.bold))
  console.log(row(center('ML-DSA-65 / NIST FIPS 204 / Base registry compatible', WIDTH - 4), theme.dim))
  console.log(row(center('Local protocol validation - no network calls', WIDTH - 4), theme.muted))
  console.log(row())
  console.log(theme.blue(box.bl + box.h.repeat(WIDTH - 2) + box.br))
  console.log()
}

const toHex = bytes => Buffer.from(bytes).toString('hex')
const digestHex = bytes => toHex(shake256(bytes, { dkLen: 32 }))
const abbr = (hex, left = 10, right = 10) => `${hex.slice(0, left)}...${hex.slice(-right)}`
const ms = value => `${value.toFixed(2)} ms`

function deriveAddress(publicKey) {
  const hash = keccak_256(publicKey)
  const raw = toHex(hash.slice(12)).toLowerCase()
  const checksumHash = toHex(keccak_256(new TextEncoder().encode(raw)))

  let address = '0x'
  for (let i = 0; i < raw.length; i += 1) {
    address += parseInt(checksumHash[i], 16) >= 8 ? raw[i].toUpperCase() : raw[i]
  }
  return address
}

function buildSignedBytes({ agentAddress, nonce, timestamp, action }) {
  const prefix = new TextEncoder().encode('CEVEX-MSG-v1')
  const address = Buffer.from(agentAddress.slice(2), 'hex')
  const buffer = new Uint8Array(prefix.length + 1 + 20 + 8 + 8 + 4 + action.length)
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

  const length = action.length
  buffer[offset] = (length >>> 24) & 0xff
  buffer[offset + 1] = (length >>> 16) & 0xff
  buffer[offset + 2] = (length >>> 8) & 0xff
  buffer[offset + 3] = length & 0xff
  offset += 4

  buffer.set(action, offset)
  return buffer
}

function runKeygen() {
  const started = performance.now()
  const seed = shake256(randomBytes(64), { dkLen: 32 })
  const { publicKey, secretKey } = ml_dsa65.keygen(seed)
  const agentAddress = deriveAddress(publicKey)
  const publicKeyHash = digestHex(publicKey)
  const elapsed = performance.now() - started

  section('01', 'Key Generation', 'Generate a fresh ML-DSA identity from conditioned entropy', [
    { group: 'Parameters' },
    { field: 'Scheme', value: 'CRYSTALS-Dilithium / ML-DSA-65', note: 'NIST FIPS 204' },
    { field: 'Security', value: '162-bit post-quantum target', note: 'Module LWE' },
    { field: 'Entropy', value: 'OS CSPRNG -> SHAKE-256 seed', note: 'local demo mode' },
    { group: 'Identity Material' },
    { field: 'Public key', value: `${publicKey.length} bytes`, note: `hash ${abbr(publicKeyHash, 8, 8)}` },
    { field: 'Secret key', value: `${secretKey.length} bytes  redacted`, note: 'never printed' },
    { field: 'Address', value: agentAddress, note: 'keccak256(pk)[12..32]' },
    { group: 'Timing' },
    { field: 'Elapsed', value: ms(elapsed), note: 'seed + keypair', valueStyle: theme.success },
  ])

  return { publicKey, secretKey, publicKeyHash, agentAddress, ms: elapsed }
}

function runSign(keygen) {
  const payload = {
    type: 'transfer',
    amount: '100',
    token: 'USDC',
    to: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    network: 'base',
  }
  const action = new TextEncoder().encode(JSON.stringify(payload))
  const nonce = 1
  const timestamp = Date.now()
  const signedBytes = buildSignedBytes({
    agentAddress: keygen.agentAddress,
    nonce,
    timestamp,
    action,
  })

  const started = performance.now()
  const signature = ml_dsa65.sign(keygen.secretKey, signedBytes)
  const signedBytesHash = digestHex(signedBytes)
  const signatureHash = digestHex(signature)
  const elapsed = performance.now() - started

  section('02', 'Message Signing', 'Bind a structured action to the CEVEX-MSG-v1 domain', [
    { group: 'Action' },
    { field: 'Payload', value: 'transfer 100 USDC on Base', note: 'JSON action' },
    { field: 'Nonce', value: String(nonce), note: 'replay guard' },
    { field: 'Timestamp', value: new Date(timestamp).toISOString(), note: 'UTC ms' },
    { field: 'Domain', value: 'CEVEX-MSG-v1', note: 'protocol binding', valueStyle: theme.cyan },
    { group: 'Artifacts' },
    { field: 'Signed bytes', value: `${signedBytes.length} bytes`, note: `hash ${abbr(signedBytesHash, 8, 8)}` },
    { field: 'Signature', value: `${signature.length} bytes`, note: `hash ${abbr(signatureHash, 8, 8)}` },
    { group: 'Timing' },
    { field: 'Elapsed', value: ms(elapsed), note: 'signature time', valueStyle: theme.success },
  ])

  return {
    signature,
    signatureHash,
    signedBytes,
    signedBytesHash,
    action,
    nonce,
    timestamp,
    ms: elapsed,
  }
}

function runVerify(keygen, signing) {
  const started = performance.now()
  const valid = ml_dsa65.verify(keygen.publicKey, signing.signedBytes, signing.signature)
  const elapsed = performance.now() - started

  const tampered = new Uint8Array(signing.signature)
  tampered[42] ^= 0x01
  const signatureTamperAccepted = ml_dsa65.verify(keygen.publicKey, signing.signedBytes, tampered)

  const tamperedMessage = new Uint8Array(signing.signedBytes)
  tamperedMessage[tamperedMessage.length - 1] ^= 0x01
  const messageTamperAccepted = ml_dsa65.verify(keygen.publicKey, tamperedMessage, signing.signature)

  section('03', 'Verification', 'Validate the signature and reject modified inputs', [
    { group: 'Inputs' },
    { field: 'Input', value: 'public key + signed bytes + signature', note: 'no CA' },
    { field: 'Lookup', value: 'in-memory public key', note: 'registry-free demo' },
    { field: 'Trust anchor', value: 'none', note: 'local lattice math', valueStyle: theme.cyan },
    { group: 'Checks' },
    {
      field: 'Signature',
      value: valid ? 'VALID' : 'INVALID',
      note: 'ML-DSA verify',
      valueStyle: valid ? theme.success : theme.danger,
    },
    {
      field: 'Sig tamper',
      value: signatureTamperAccepted ? 'FAILED' : 'REJECTED',
      note: 'single bit flip',
      valueStyle: signatureTamperAccepted ? theme.danger : theme.success,
    },
    {
      field: 'Msg tamper',
      value: messageTamperAccepted ? 'FAILED' : 'REJECTED',
      note: 'payload bit flip',
      valueStyle: messageTamperAccepted ? theme.danger : theme.success,
    },
    { group: 'Timing' },
    { field: 'Elapsed', value: ms(elapsed), note: 'verification time', valueStyle: theme.success },
  ])

  return { valid, signatureTamperAccepted, messageTamperAccepted, ms: elapsed }
}

function showSummary(keygen, signing, verification) {
  const total = keygen.ms + signing.ms + verification.ms
  const passed = verification.valid &&
    !verification.signatureTamperAccepted &&
    !verification.messageTamperAccepted

  section('04', 'Run Summary', 'Protocol validation result and execution profile', [
    { group: 'Result' },
    {
      field: 'Run result',
      value: passed ? 'PASS' : 'FAIL',
      note: passed ? 'all checks passed' : 'investigate output',
      valueStyle: passed ? theme.success : theme.danger,
    },
    { field: 'Total time', value: ms(total), note: 'keygen + sign + verify', valueStyle: theme.success },
    { group: 'Context' },
    { field: 'PQC scheme', value: 'CRYSTALS-Dilithium / ML-DSA-65', note: 'default path' },
    { field: 'Identity', value: keygen.agentAddress, note: 'registry-ready' },
    { field: 'Artifacts', value: 'none written to disk', note: 'demo is memory-only' },
  ])
}

function showCliReference() {
  if (!renderTerminal) return
  console.log(titleLine('', 'CLI Reference', 'Commands aligned with the current CLI surface'))
  console.log(commandRule())
  console.log(commandRow('Command', 'Example', theme.bold, theme.bold))
  console.log(commandRule())
  console.log(commandRow('install', 'npm install -g @cevex/cli', theme.dim, theme.dim))
  console.log(commandRow('provision', 'cevex provision --entropy software --scheme dilithium3 --out agent.key'))
  console.log(commandRow('sign', 'cevex sign --key agent.key --message message.json --out signed.json'))
  console.log(commandRow('verify', 'cevex verify --message signed.json --network base'))
  console.log(commandRow('info', 'cevex info 0xAgentAddress --network base'))
  console.log(commandRow('rotate', 'cevex rotate --key agent.key --entropy software --out rotated.key'))
  console.log(commandRow('revoke', 'cevex revoke --key agent.key --reason decommissioned --yes'))
  console.log(commandRow('batch-verify', 'cevex batch-verify --messages signed-batch.json'))
  console.log(commandRule('bottom'))
  console.log()

  console.log(titleLine('', 'Demo Commands', 'Local validation modes and output controls'))
  console.log(commandRule())
  console.log(commandRow('Command', 'Description', theme.bold, theme.bold))
  console.log(commandRule())
  console.log(commandRow('node run.mjs', 'full protocol validation'))
  console.log(commandRow('node run.mjs keygen', 'run key generation only'))
  console.log(commandRow('node run.mjs sign', 'run key generation and signing'))
  console.log(commandRow('node run.mjs verify', 'run key generation, signing, and verification'))
  console.log(commandRow('node run.mjs help', 'show this screen'))
  console.log(commandRow('--json', 'emit machine-readable validation result'))
  console.log(commandRow('--color / --no-color', 'force or disable branded terminal colors'))
  console.log(commandRow('--ascii', 'use plain ASCII borders and wordmark'))
  console.log(commandRule('bottom'))
  console.log()
}

function showHelp() {
  showBanner()
  section('00', 'About', 'Offline developer validation for the CEVEX message flow', [
    { field: 'Purpose', value: 'local CEVEX protocol validation', note: 'developer demo' },
    { field: 'Crypto', value: 'real ML-DSA-65 keygen/sign/verify', note: '@noble/post-quantum' },
    { field: 'Network', value: 'none', note: 'runs offline' },
    { field: 'Secrets', value: 'held in memory, never printed', note: 'redacted output' },
  ])
  showCliReference()
}

function emitHelpJson() {
  console.log(JSON.stringify({
    command: 'node run.mjs [mode] [options]',
    modes: {
      full: 'run key generation, signing, verification, and summary',
      keygen: 'run key generation only',
      sign: 'run key generation and signing',
      verify: 'run key generation, signing, and verification',
      help: 'show usage information',
    },
    options: {
      json: 'emit machine-readable validation result',
      color: 'force branded terminal colors',
      noColor: 'disable terminal colors',
    },
  }, null, 2))
}

function emitJson({ keygen, signing, verification, mode }) {
  const passed = verification
    ? verification.valid &&
      !verification.signatureTamperAccepted &&
      !verification.messageTamperAccepted
    : true

  const payload = {
    protocol: 'CEVEX-MSG-v1',
    mode,
    result: passed ? 'PASS' : 'FAIL',
    scheme: 'ML-DSA-65',
    network: 'offline',
    agentAddress: keygen.agentAddress,
    publicKeyHash: keygen.publicKeyHash,
    messageHash: signing?.signedBytesHash,
    signatureHash: signing?.signatureHash,
    checks: verification
      ? {
          signatureValid: verification.valid,
          signatureTamperRejected: !verification.signatureTamperAccepted,
          messageTamperRejected: !verification.messageTamperAccepted,
        }
      : undefined,
    timingsMs: {
      keygen: Number(keygen.ms.toFixed(3)),
      signing: signing ? Number(signing.ms.toFixed(3)) : undefined,
      verification: verification ? Number(verification.ms.toFixed(3)) : undefined,
    },
    artifacts: [],
  }

  console.log(JSON.stringify(payload, null, 2))
}

if (cmd === 'help') {
  if (jsonMode) emitHelpJson()
  else showHelp()
  process.exit(0)
}

if (cmd && !['keygen', 'sign', 'verify'].includes(cmd)) {
  console.error()
  console.error(theme.danger(`Unknown command: ${cmd}`))
  console.error(`Run ${theme.primary('node run.mjs help')} for available commands.`)
  console.error()
  process.exit(1)
}

showBanner()

const keygen = runKeygen()
if (cmd === 'keygen') {
  if (jsonMode) emitJson({ keygen, mode: 'keygen' })
  process.exit(0)
}

const signing = runSign(keygen)
if (cmd === 'sign') {
  if (jsonMode) emitJson({ keygen, signing, mode: 'sign' })
  process.exit(0)
}

const verification = runVerify(keygen, signing)
const passed = verification.valid &&
  !verification.signatureTamperAccepted &&
  !verification.messageTamperAccepted
if (cmd === 'verify') {
  if (jsonMode) emitJson({ keygen, signing, verification, mode: 'verify' })
  process.exit(passed ? 0 : 1)
}

showSummary(keygen, signing, verification)
showCliReference()

if (jsonMode) {
  emitJson({ keygen, signing, verification, mode: 'full' })
}

if (!passed) {
  process.exitCode = 1
}
