/**
 * CEVEX Protocol — Live Demo
 *
 * Runs a full keygen → sign → verify cycle locally.
 * No blockchain connection, no trusted party, no network.
 *
 * Install deps:   cd demo && npm install
 * Run:            node run.mjs
 */

import { ml_dsa65 }       from '@noble/post-quantum/ml-dsa'
import { shake256 }        from '@noble/hashes/sha3'
import { keccak_256 }      from '@noble/hashes/sha3'
import { randomBytes }     from 'crypto'
import { performance }     from 'perf_hooks'

// ─── ANSI helpers ────────────────────────────────────────────────────────────

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  white:  '\x1b[97m',
  gray:   '\x1b[90m',
}

const bold  = s  => `${C.bold}${s}${C.reset}`
const dim   = s  => `${C.dim}${C.gray}${s}${C.reset}`
const cyan  = s  => `${C.cyan}${s}${C.reset}`
const blue  = s  => `${C.blue}${s}${C.reset}`
const green = s  => `${C.green}${s}${C.reset}`
const yellow= s  => `${C.yellow}${s}${C.reset}`
const label = s  => `  ${C.gray}${s.padEnd(22)}${C.reset}`
const line  = () => console.log(dim('  ' + '─'.repeat(56)))

// ─── Utilities ───────────────────────────────────────────────────────────────

function toHex(bytes) {
  return Buffer.from(bytes).toString('hex')
}

function abbreviate(hex, head = 8, tail = 8) {
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`
}

function deriveAddress(publicKey) {
  const hash = keccak_256(publicKey)
  const raw  = Array.from(hash.slice(12)).map(b => b.toString(16).padStart(2, '0')).join('')
  // EIP-55 checksum
  const addrHex = raw.toLowerCase()
  const hashHex = toHex(keccak_256(new TextEncoder().encode(addrHex)))
  let checksummed = '0x'
  for (let i = 0; i < addrHex.length; i++) {
    checksummed += parseInt(hashHex[i], 16) >= 8 ? addrHex[i].toUpperCase() : addrHex[i]
  }
  return checksummed
}

// ─── Wire format ─────────────────────────────────────────────────────────────
//
//   CEVEX-MSG-v1 (13) | version (1) | address (20) |
//   nonce (8) | timestamp (8) | actionLen (4) | action (N)

const DOMAIN_PREFIX = new TextEncoder().encode('CEVEX-MSG-v1')

function buildSignedBytes({ agentAddress, nonce, timestamp, action }) {
  const addr = Buffer.from(agentAddress.slice(2), 'hex')
  const buf  = new Uint8Array(DOMAIN_PREFIX.length + 1 + 20 + 8 + 8 + 4 + action.length)
  let off = 0

  buf.set(DOMAIN_PREFIX, off); off += DOMAIN_PREFIX.length
  buf[off++] = 0x01

  buf.set(addr, off); off += 20

  const writeU64 = (v) => {
    const hi = Number((v >> 32n) & 0xffffffffn)
    const lo = Number(v & 0xffffffffn)
    buf[off]   = (hi >>> 24) & 0xff; buf[off+1] = (hi >>> 16) & 0xff
    buf[off+2] = (hi >>> 8)  & 0xff; buf[off+3] = hi & 0xff
    buf[off+4] = (lo >>> 24) & 0xff; buf[off+5] = (lo >>> 16) & 0xff
    buf[off+6] = (lo >>> 8)  & 0xff; buf[off+7] = lo & 0xff
    off += 8
  }
  writeU64(BigInt(nonce))
  writeU64(BigInt(timestamp))

  const len = action.length
  buf[off++] = (len >>> 24) & 0xff; buf[off++] = (len >>> 16) & 0xff
  buf[off++] = (len >>> 8)  & 0xff; buf[off++] = len & 0xff

  buf.set(action, off)
  return buf
}

// ─── Demo ────────────────────────────────────────────────────────────────────

console.log()
console.log(bold(cyan('  CEVEX Protocol')), dim('— Post-Quantum Identity for Autonomous AI Agents'))
console.log(dim('  ' + '═'.repeat(56)))
console.log()

// ── 1. Key Generation ────────────────────────────────────────────────────────

console.log(bold('  [ 1 / 3 ]  KEY GENERATION'))
line()

const t0 = performance.now()

// Sample 64 bytes of OS entropy
const rawEntropy = randomBytes(64)

// Condition with SHAKE-256 (NIST SP 800-90B style)
const seed = shake256(rawEntropy, { dkLen: 32 })

// Generate Dilithium-3 keypair (ML-DSA-65, NIST FIPS 204)
const { publicKey, secretKey } = ml_dsa65.keygen(seed)

const t_keygen = performance.now() - t0

const agentAddress = deriveAddress(publicKey)

console.log(label('Scheme'),       cyan('CRYSTALS-Dilithium') + dim(' (NIST FIPS 204 / ML-DSA-65)'))
console.log(label('Security'),     yellow('162-bit post-quantum') + dim(' · Module LWE hardness'))
console.log(label('Entropy'),      'OS CSPRNG · SHAKE-256 conditioned')
console.log(label('Public key'),   `${bold(publicKey.length + ' bytes')}  ${dim(abbreviate(toHex(publicKey)))}`)
console.log(label('Secret key'),   `${bold(secretKey.length + ' bytes')}  ${dim(abbreviate(toHex(secretKey)))}`)
console.log(label('Agent address'), bold(agentAddress))
console.log(label('Time'),         green(`${t_keygen.toFixed(2)} ms`))
console.log()

// ── 2. Signing ───────────────────────────────────────────────────────────────

console.log(bold('  [ 2 / 3 ]  SIGNING'))
line()

const action   = new TextEncoder().encode(JSON.stringify({
  type:      'transfer',
  amount:    '100',
  token:     'USDC',
  recipient: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  network:   'base',
}))
const nonce     = 1
const timestamp = Date.now()

const signedBytes = buildSignedBytes({ agentAddress, nonce, timestamp, action })

const t1 = performance.now()
const signature  = ml_dsa65.sign(secretKey, signedBytes)
const t_sign = performance.now() - t1

console.log(label('Action'),    dim(new TextDecoder().decode(action).slice(0, 58) + '…'))
console.log(label('Nonce'),     bold(nonce.toString()))
console.log(label('Timestamp'), new Date(timestamp).toISOString())
console.log(label('Domain'),    cyan('"CEVEX-MSG-v1"') + dim(' prefix bound to every signature'))
console.log(label('Signature'), `${bold(signature.length + ' bytes')}  ${dim(abbreviate(toHex(signature)))}`)
console.log(label('Time'),      green(`${t_sign.toFixed(2)} ms`))
console.log()

// ── 3. Verification ──────────────────────────────────────────────────────────

console.log(bold('  [ 3 / 3 ]  VERIFICATION'))
line()

const t2 = performance.now()
const valid = ml_dsa65.verify(publicKey, signedBytes, signature)
const t_verify = performance.now() - t2

// Tamper test — flip one byte in the signature
const tampered = new Uint8Array(signature)
tampered[42] ^= 0x01
const invalidResult = ml_dsa65.verify(publicKey, signedBytes, tampered)

console.log(label('Input'),          'public key · signed bytes · signature')
console.log(label('Trusted party'),  bold(yellow('none')) + dim('  — pure lattice math, no CA'))
console.log(label('Result'),         valid ? bold(green('✓  VALID')) : bold('\x1b[31m✗  INVALID\x1b[0m'))
console.log(label('Time'),           green(`${t_verify.toFixed(2)} ms`))
console.log()
console.log(label('Tamper test'),    invalidResult
  ? '\x1b[31m✗  INCORRECTLY PASSED\x1b[0m'
  : dim('flip 1 bit → ') + bold(green('✗  REJECTED  ')) + dim('(as expected)'))
console.log()

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(dim('  ' + '═'.repeat(56)))
console.log()
console.log(bold('  Summary'))
console.log()
console.log(label('Total time'),       green(`${(t_keygen + t_sign + t_verify).toFixed(2)} ms`))
console.log(label('Quantum-safe'),     bold(green('yes')) + dim('  · Shor\'s algorithm cannot break this'))
console.log(label('Replay-proof'),     bold(green('yes')) + dim('  · nonce + timestamp + domain prefix'))
console.log(label('Trustless'),        bold(green('yes')) + dim('  · any party can verify with the public key'))
console.log(label('On-chain anchor'),  dim('agentAddress → Base registry (CevexRegistry.sol)'))
console.log()
console.log(dim('  github.com/cevexlabs/Cevex'))
console.log()
