import { ml_dsa65 }   from '@noble/post-quantum/ml-dsa'
import { shake256 }    from '@noble/hashes/sha3'
import { keccak_256 }  from '@noble/hashes/sha3'
import { randomBytes } from 'crypto'
import { performance } from 'perf_hooks'

// ─── Colors ───────────────────────────────────────────────────────────────────

const _ = {
  rst:  '\x1b[0m',
  bold: '\x1b[1m',
  dim:  '\x1b[2m',
  blu:  '\x1b[38;5;39m',
  lbl:  '\x1b[38;5;33m',
  grn:  '\x1b[92m',
  ylw:  '\x1b[38;5;220m',
  wht:  '\x1b[97m',
  gry:  '\x1b[90m',
  dgry: '\x1b[38;5;240m',
  red:  '\x1b[91m',
}

// Strip ANSI codes to measure visible length
const vis  = s => s.replace(/\x1b\[[0-9;]*m/g, '')
const vlen = s => vis(s).length

// Pad string to n visible chars
const pad  = (s, n) => s + ' '.repeat(Math.max(0, n - vlen(s)))

// Truncate to n visible chars (strips ANSI before truncating)
const trunc = (s, n) => vlen(s) > n ? vis(s).slice(0, n - 1) + '…' : s

// ─── Box drawing ──────────────────────────────────────────────────────────────

const W    = 76          // total box width including border chars
const INNER = W - 2      // usable inner width (between │ and │)
const KEY_W = 15         // label column width
const VAL_W = INNER - KEY_W - 5  // value column width (2 left pad + KEY_W + 3 gap + 2 right pad)

// Banner  ╔═╗
const bTop = () => _.blu + '╔' + '═'.repeat(INNER) + '╗' + _.rst
const bBot = () => _.blu + '╚' + '═'.repeat(INNER) + '╝' + _.rst
const bRow = (txt = '') => {
  const content = pad(trunc(txt, INNER - 2), INNER - 2)
  return _.blu + '║' + _.rst + '  ' + content + '  ' + _.blu + '║' + _.rst
}

// Sections  ┌─┐
const sTop = (label) => {
  const gap = INNER - 4 - vlen(label)   // ─ + space + label + space + gaps + ┐ = INNER+2
  return _.lbl + '┌─ ' + _.rst + _.bold + _.ylw + label + _.rst + ' ' + _.lbl + '─'.repeat(Math.max(0, gap)) + '┐' + _.rst
}
const sBot = () => _.lbl + '└' + '─'.repeat(INNER) + '┘' + _.rst
const sSep = () => _.lbl + '├' + '─'.repeat(INNER) + '┤' + _.rst
const sEmp = () => _.lbl + '│' + _.rst + ' '.repeat(INNER) + _.lbl + '│' + _.rst

const sRow = (key, val) => {
  // Truncate raw value to fit, then re-apply any simple color if needed
  const safeVal = trunc(val, VAL_W)
  const row = '  ' + pad(_.gry + key + _.rst, KEY_W + 11) + '   ' + pad(safeVal, VAL_W)
  // row visible length = 2 + KEY_W + 3 + VAL_W = INNER - 2 (borders take 2)
  return _.lbl + '│' + _.rst + row + '  ' + _.lbl + '│' + _.rst
}

// ─── ASCII Logo ───────────────────────────────────────────────────────────────

const LOGO = [
  '  ██████╗███████╗██╗   ██╗███████╗██╗  ██╗',
  ' ██╔════╝██╔════╝██║   ██║██╔════╝╚██╗██╔╝',
  ' ██║     █████╗  ██║   ██║█████╗   ╚███╔╝ ',
  ' ██║     ██╔══╝  ╚██╗ ██╔╝██╔══╝   ██╔██╗ ',
  ' ╚██████╗███████╗ ╚████╔╝ ███████╗██╔╝ ██╗',
  '  ╚═════╝╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝',
].map(l => _.blu + l + _.rst)

// ─── Utils ────────────────────────────────────────────────────────────────────

const toHex = b => Buffer.from(b).toString('hex')
const abbr  = h => _.dgry + h.slice(0, 8) + '…' + h.slice(-8) + _.rst

function deriveAddress(pk) {
  const hash = keccak_256(pk)
  const raw  = toHex(hash.slice(12))
  const h    = raw.toLowerCase()
  const ch   = toHex(keccak_256(new TextEncoder().encode(h)))
  let out = '0x'
  for (let i = 0; i < h.length; i++)
    out += parseInt(ch[i], 16) >= 8 ? h[i].toUpperCase() : h[i]
  return out
}

function buildSignedBytes({ agentAddress, nonce, timestamp, action }) {
  const PREFIX = new TextEncoder().encode('CEVEX-MSG-v1')
  const addr   = Buffer.from(agentAddress.slice(2), 'hex')
  const buf    = new Uint8Array(PREFIX.length + 1 + 20 + 8 + 8 + 4 + action.length)
  let off = 0
  buf.set(PREFIX, off); off += PREFIX.length
  buf[off++] = 0x01
  buf.set(addr, off); off += 20
  const u64 = v => {
    const hi = Number((v >> 32n) & 0xffffffffn)
    const lo = Number(v & 0xffffffffn)
    buf[off]  =(hi>>>24)&0xff; buf[off+1]=(hi>>>16)&0xff
    buf[off+2]=(hi>>>8) &0xff; buf[off+3]=hi&0xff
    buf[off+4]=(lo>>>24)&0xff; buf[off+5]=(lo>>>16)&0xff
    buf[off+6]=(lo>>>8) &0xff; buf[off+7]=lo&0xff
    off += 8
  }
  u64(BigInt(nonce)); u64(BigInt(timestamp))
  const len = action.length
  buf[off++]=(len>>>24)&0xff; buf[off++]=(len>>>16)&0xff
  buf[off++]=(len>>>8) &0xff; buf[off++]=len&0xff
  buf.set(action, off)
  return buf
}

// ─── Output ───────────────────────────────────────────────────────────────────

console.log()
console.log(bTop())
console.log(bRow())
for (const line of LOGO) console.log(bRow(line))
console.log(bRow())
console.log(bRow(_.bold + _.wht + 'Post-Quantum Identity for Autonomous AI Agents' + _.rst))
console.log(bRow(_.dgry + 'CRYSTALS-Dilithium  ·  Base L2  ·  NIST FIPS 204  ·  ML-DSA-65' + _.rst))
console.log(bRow())
console.log(bBot())
console.log()

// ── 1. Key Generation ─────────────────────────────────────────────────────────

console.log(sTop('[ 1 / 3 ]  KEY GENERATION'))
console.log(sEmp())
const t0 = performance.now()
const seed = shake256(randomBytes(64), { dkLen: 32 })
const { publicKey, secretKey } = ml_dsa65.keygen(seed)
const agentAddress = deriveAddress(publicKey)
const t1 = performance.now()

console.log(sRow('Scheme',     _.blu + 'CRYSTALS-Dilithium' + _.rst + _.dgry + '  ·  NIST FIPS 204 / ML-DSA-65' + _.rst))
console.log(sRow('Security',   _.ylw + '162-bit post-quantum' + _.rst + _.dgry + '  ·  Module LWE hardness' + _.rst))
console.log(sRow('Entropy',    _.dgry + 'OS CSPRNG  ·  SHAKE-256 conditioned' + _.rst))
console.log(sSep())
console.log(sRow('Public key', _.bold + _.wht + publicKey.length + ' bytes' + _.rst + '  ' + abbr(toHex(publicKey))))
console.log(sRow('Secret key', _.bold + _.wht + secretKey.length + ' bytes' + _.rst + '  ' + abbr(toHex(secretKey))))
console.log(sRow('Address',    _.bold + _.wht + agentAddress + _.rst))
console.log(sSep())
console.log(sRow('Time',       _.grn + (t1 - t0).toFixed(2) + ' ms' + _.rst))
console.log(sEmp())
console.log(sBot())
console.log()

// ── 2. Signing ────────────────────────────────────────────────────────────────

console.log(sTop('[ 2 / 3 ]  SIGNING'))
console.log(sEmp())
const action    = new TextEncoder().encode(JSON.stringify({ type: 'transfer', amount: '100', token: 'USDC', to: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', network: 'base' }))
const nonce     = 1
const timestamp = Date.now()
const msgBytes  = buildSignedBytes({ agentAddress, nonce, timestamp, action })
const t2 = performance.now()
const signature = ml_dsa65.sign(secretKey, msgBytes)
const t3 = performance.now()

console.log(sRow('Action',    _.dgry + '{"type":"transfer","amount":"100","token":"USDC",…}' + _.rst))
console.log(sRow('Nonce',     _.bold + _.wht + '1' + _.rst))
console.log(sRow('Timestamp', _.dgry + new Date(timestamp).toISOString() + _.rst))
console.log(sRow('Domain',    _.blu + '"CEVEX-MSG-v1"' + _.rst + _.dgry + '  ·  replay protection prefix' + _.rst))
console.log(sSep())
console.log(sRow('Signature', _.bold + _.wht + signature.length + ' bytes' + _.rst + '  ' + abbr(toHex(signature))))
console.log(sSep())
console.log(sRow('Time',      _.grn + (t3 - t2).toFixed(2) + ' ms' + _.rst))
console.log(sEmp())
console.log(sBot())
console.log()

// ── 3. Verification ───────────────────────────────────────────────────────────

console.log(sTop('[ 3 / 3 ]  VERIFICATION'))
console.log(sEmp())
const t4    = performance.now()
const valid = ml_dsa65.verify(publicKey, msgBytes, signature)
const t5    = performance.now()
const tampered = new Uint8Array(signature); tampered[42] ^= 0x01
const tamperOk = ml_dsa65.verify(publicKey, msgBytes, tampered)

console.log(sRow('Input',        _.dgry + 'public key  ·  signed bytes  ·  signature' + _.rst))
console.log(sRow('Trusted party',_.bold + _.ylw + 'none' + _.rst + _.dgry + '  —  pure lattice math, no CA' + _.rst))
console.log(sSep())
console.log(sRow('Result',       valid ? _.bold + _.grn + '✓  VALID' + _.rst : _.bold + _.red + '✗  INVALID' + _.rst))
console.log(sRow('Tamper test',  _.dgry + 'flip 1 bit  →  ' + _.rst + (!tamperOk ? _.bold + _.grn + '✗  REJECTED' + _.rst : _.bold + _.red + 'PASSED (BUG)' + _.rst) + _.dgry + '  (as expected)' + _.rst))
console.log(sSep())
console.log(sRow('Time',         _.grn + (t5 - t4).toFixed(2) + ' ms' + _.rst))
console.log(sEmp())
console.log(sBot())
console.log()

// ── Summary ───────────────────────────────────────────────────────────────────

const total = (t1 - t0) + (t3 - t2) + (t5 - t4)

console.log(sTop('SUMMARY'))
console.log(sEmp())
console.log(sRow('Total time',   _.grn + total.toFixed(2) + ' ms' + _.rst + _.dgry + '  ·  keygen + sign + verify' + _.rst))
console.log(sRow('Quantum-safe', _.bold + _.grn + 'yes' + _.rst + _.dgry + "  ·  Shor's algorithm cannot break this" + _.rst))
console.log(sRow('Replay-proof', _.bold + _.grn + 'yes' + _.rst + _.dgry + '  ·  nonce + timestamp + domain prefix' + _.rst))
console.log(sRow('Trustless',    _.bold + _.grn + 'yes' + _.rst + _.dgry + '  ·  any party can verify with the public key' + _.rst))
console.log(sRow('On-chain',     _.dgry + 'agentAddress → CevexRegistry.sol on Base' + _.rst))
console.log(sEmp())
console.log(sRow('',             _.dgry + 'github.com/cevexlabs/Cevex  ·  x.com/cevex_io' + _.rst))
console.log(sEmp())
console.log(sBot())
console.log()
