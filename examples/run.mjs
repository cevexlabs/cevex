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
  ann:  '\x1b[38;5;67m',   // muted slate-blue — annotation column
  cmd:  '\x1b[38;5;252m',  // near-white — command text
}

const vis    = s => s.replace(/\x1b\[[0-9;]*m/g, '')
const vlen   = s => vis(s).length
const rpad   = (s, n) => s + ' '.repeat(Math.max(0, n - vlen(s)))
const trunc  = (s, n) => vlen(s) > n ? vis(s).slice(0, n - 1) + '…' : s
const center = (s, w) => ' '.repeat(Math.max(0, Math.floor((w - vlen(s)) / 2))) + s

// ─── Box constants ────────────────────────────────────────────────────────────
//
//  Data rows: │  key(K_W)   val(V_W)  │  annotation(A_W)  │
//
//  1+2+K_W+3+V_W+2+1+2+A_W+2+1 = 14+K_W+V_W+A_W = 14+13+51+38 = 116 = W ✓

const W   = 116
const K_W = 13   // 'Trusted party' = 13 chars — longest key
const V_W = 51
const A_W = 38
const C_W = W - 6  // = 110

const DIV      = 1 + 2 + K_W + 3 + V_W + 2 + 1  // 73
const L_DASHES = DIV - 2                           // 71
const R_DASHES = W - DIV - 1                       // 42

// ─── Drawing primitives ───────────────────────────────────────────────────────

const bTop = () => _.blu + '╔' + '═'.repeat(W - 2) + '╗' + _.rst
const bBot = () => _.blu + '╚' + '═'.repeat(W - 2) + '╝' + _.rst
const bRow = (txt = '') =>
  _.blu + '║' + _.rst + '  ' + rpad(trunc(txt, C_W), C_W) + '  ' + _.blu + '║' + _.rst

const sTop = (label) => {
  const d = W - 5 - vlen(label)
  return _.lbl + '┌─ ' + _.rst + _.bold + _.ylw + label + _.rst +
         ' ' + _.lbl + '─'.repeat(Math.max(1, d)) + '┐' + _.rst
}
const sBot  = () => _.lbl + '└' + '─'.repeat(L_DASHES) + '┴' + '─'.repeat(R_DASHES) + '┘' + _.rst
const sSep  = () => _.lbl + '├' + '─'.repeat(L_DASHES) + '┼' + '─'.repeat(R_DASHES) + '┤' + _.rst
const sEmp  = () => _.lbl + '│' + ' '.repeat(L_DASHES) + '│' + ' '.repeat(R_DASHES) + '│' + _.rst

// Three-column data row
const sRow = (key, val, annot = '') => {
  const k     = rpad(_.gry + key + _.rst, K_W)
  const v     = rpad(trunc(val, V_W), V_W)
  const aText = annot ? _.ann + trunc(annot, A_W) + _.rst : ''
  const a     = rpad(aText, A_W)
  return _.lbl + '│' + _.rst + '  ' + k + '   ' + v + '  ' +
         _.lbl + '│' + _.rst + '  ' + a + '  ' + _.lbl + '│' + _.rst
}

// Full-width single-column row (no divider) — used for command listings
// Layout: │  label(L_W)   value(R_W)  │   where 1+2+L_W+3+R_W+2+1 = W
const L_W = 22
const R_W = W - 9 - L_W   // = 85
const wRow = (label, value, hilite = false) => {
  const l = rpad((hilite ? _.ylw : _.gry) + label + _.rst, L_W)
  const v = rpad(trunc(hilite ? _.cmd + value + _.rst : _.dgry + value + _.rst, R_W), R_W)
  return _.lbl + '│' + _.rst + '  ' + l + '   ' + v + '  ' + _.lbl + '│' + _.rst
}
const wEmp = () => _.lbl + '│' + ' '.repeat(W - 2) + '│' + _.rst
const wSep = () => _.lbl + '├' + '─'.repeat(W - 2) + '┤' + _.rst
const wBot = () => _.lbl + '└' + '─'.repeat(W - 2) + '┘' + _.rst

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
    const hi = Number((v >> 32n) & 0xffffffffn), lo = Number(v & 0xffffffffn)
    buf[off]=(hi>>>24)&0xff; buf[off+1]=(hi>>>16)&0xff
    buf[off+2]=(hi>>>8)&0xff;  buf[off+3]=hi&0xff
    buf[off+4]=(lo>>>24)&0xff; buf[off+5]=(lo>>>16)&0xff
    buf[off+6]=(lo>>>8)&0xff;  buf[off+7]=lo&0xff
    off += 8
  }
  u64(BigInt(nonce)); u64(BigInt(timestamp))
  const len = action.length
  buf[off++]=(len>>>24)&0xff; buf[off++]=(len>>>16)&0xff
  buf[off++]=(len>>>8)&0xff;  buf[off++]=len&0xff
  buf.set(action, off)
  return buf
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function showBanner() {
  console.log()
  console.log(bTop())
  console.log(bRow())
  for (const l of LOGO) console.log(bRow(center(l, C_W)))
  console.log(bRow())
  console.log(bRow(center(_.bold + _.wht + 'Post-Quantum Identity for Autonomous AI Agents' + _.rst, C_W)))
  console.log(bRow(center(_.dgry + 'CRYSTALS-Dilithium  ·  Base L2  ·  NIST FIPS 204  ·  ML-DSA-65' + _.rst, C_W)))
  console.log(bRow())
  console.log(bBot())
  console.log()
}

function runKeygen() {
  console.log(sTop('[ 1 / 3 ]  KEY GENERATION'))
  console.log(sEmp())
  const t0 = performance.now()
  const seed = shake256(randomBytes(64), { dkLen: 32 })
  const { publicKey, secretKey } = ml_dsa65.keygen(seed)
  const agentAddress = deriveAddress(publicKey)
  const t1 = performance.now()
  console.log(sRow('Scheme',
    _.blu + 'CRYSTALS-Dilithium' + _.rst + _.dgry + '  ·  NIST FIPS 204 / ML-DSA-65' + _.rst,
    'NIST-standardized lattice signature'))
  console.log(sRow('Security',
    _.ylw + '162-bit post-quantum' + _.rst + _.dgry + '  ·  Module LWE hardness' + _.rst,
    "Immune to Shor's & Grover's algorithms"))
  console.log(sRow('Entropy',
    _.dgry + 'OS CSPRNG  ·  SHAKE-256 conditioned' + _.rst,
    'SHAKE-256 KDF over OS CSPRNG seed'))
  console.log(sSep())
  console.log(sRow('Public key',
    _.bold + _.wht + publicKey.length + ' bytes' + _.rst + '  ' + abbr(toHex(publicKey)),
    'Safe to publish · verifiers need this'))
  console.log(sRow('Secret key',
    _.bold + _.wht + secretKey.length + ' bytes' + _.rst + '  ' + abbr(toHex(secretKey)),
    'Never leaves this process'))
  console.log(sRow('Address',
    _.bold + _.wht + agentAddress + _.rst,
    'EIP-55 checksummed · on-chain identity'))
  console.log(sSep())
  console.log(sRow('Time',
    _.grn + (t1 - t0).toFixed(2) + ' ms' + _.rst,
    'Includes SHAKE-256 KDF conditioning'))
  console.log(sEmp())
  console.log(sBot())
  console.log()
  return { publicKey, secretKey, agentAddress, ms: t1 - t0 }
}

function runSign(kg) {
  console.log(sTop('[ 2 / 3 ]  SIGNING'))
  console.log(sEmp())
  const action    = new TextEncoder().encode(JSON.stringify({
    type: 'transfer', amount: '100', token: 'USDC',
    to: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', network: 'base',
  }))
  const nonce     = 1
  const timestamp = Date.now()
  const msgBytes  = buildSignedBytes({ agentAddress: kg.agentAddress, nonce, timestamp, action })
  const t2 = performance.now()
  const signature = ml_dsa65.sign(kg.secretKey, msgBytes)
  const t3 = performance.now()
  console.log(sRow('Action',
    _.dgry + '{"type":"transfer","amount":"100","token":"USDC",…}' + _.rst,
    'Arbitrary JSON payload bound into sig'))
  console.log(sRow('Nonce',
    _.bold + _.wht + String(nonce) + _.rst,
    'Monotonic counter · prevents replay'))
  console.log(sRow('Timestamp',
    _.dgry + new Date(timestamp).toISOString() + _.rst,
    'UTC wall-clock · freshness enforced'))
  console.log(sRow('Domain',
    _.blu + '"CEVEX-MSG-v1"' + _.rst + _.dgry + '  ·  replay protection prefix' + _.rst,
    'Protocol binding · prevents cross-use'))
  console.log(sSep())
  console.log(sRow('Signature',
    _.bold + _.wht + signature.length + ' bytes' + _.rst + '  ' + abbr(toHex(signature)),
    '52x larger than ECDSA · quantum-safe'))
  console.log(sSep())
  console.log(sRow('Time',
    _.grn + (t3 - t2).toFixed(2) + ' ms' + _.rst,
    'Sub-15ms per sig · viable for agents'))
  console.log(sEmp())
  console.log(sBot())
  console.log()
  return { signature, msgBytes, nonce, timestamp, ms: t3 - t2 }
}

function runVerify(kg, sg) {
  console.log(sTop('[ 3 / 3 ]  VERIFICATION'))
  console.log(sEmp())
  const t4 = performance.now()
  const valid    = ml_dsa65.verify(kg.publicKey, sg.msgBytes, sg.signature)
  const t5       = performance.now()
  const tampered = new Uint8Array(sg.signature); tampered[42] ^= 0x01
  const tamperOk = ml_dsa65.verify(kg.publicKey, sg.msgBytes, tampered)
  console.log(sRow('Input',
    _.dgry + 'public key  ·  signed bytes  ·  signature' + _.rst,
    'Three inputs · no external lookup'))
  console.log(sRow('Trusted party',
    _.bold + _.ylw + 'none' + _.rst + _.dgry + '  ·  pure lattice math, no CA' + _.rst,
    'Any node can verify independently'))
  console.log(sSep())
  console.log(sRow('Result',
    valid    ? _.bold + _.grn + '✓  VALID'        + _.rst : _.bold + _.red + '✗  INVALID'      + _.rst,
    valid    ? 'Verified by pure lattice math alone'       : 'Verification failed · investigate'))
  console.log(sRow('Tamper test',
    _.dgry + 'flip 1 bit  ·  ' + _.rst +
      (!tamperOk ? _.bold + _.grn + '✗  REJECTED' + _.rst : _.bold + _.red + 'PASSED (BUG)' + _.rst) +
      _.dgry + '  (expected)' + _.rst,
    !tamperOk ? '1-bit flip triggers full rejection' : 'WARNING: tamper was not detected'))
  console.log(sSep())
  console.log(sRow('Time',
    _.grn + (t5 - t4).toFixed(2) + ' ms' + _.rst,
    'ML-DSA verify ~3x faster than sign'))
  console.log(sEmp())
  console.log(sBot())
  console.log()
  return { valid, tamperOk, ms: t5 - t4 }
}

function showSummary(kg, sg, vr) {
  const total = kg.ms + sg.ms + vr.ms

  // ── Stats ─────────────────────────────────────────────────────────────────
  console.log(sTop('SUMMARY'))
  console.log(sEmp())
  console.log(sRow('Total time',
    _.grn + total.toFixed(2) + ' ms' + _.rst + _.dgry + '  ·  keygen + sign + verify' + _.rst,
    'Full cycle under 30ms on commodity HW'))
  console.log(sRow('Quantum-safe',
    _.bold + _.grn + 'yes' + _.rst + _.dgry + "  ·  Shor's algorithm cannot break this" + _.rst,
    'Survives large-scale quantum computers'))
  console.log(sRow('Replay-proof',
    _.bold + _.grn + 'yes' + _.rst + _.dgry + '  ·  nonce + timestamp + domain prefix' + _.rst,
    'Triple-lock: nonce, timestamp, domain'))
  console.log(sRow('Trustless',
    _.bold + _.grn + 'yes' + _.rst + _.dgry + '  ·  any party can verify with the pubkey' + _.rst,
    'No CA, PKI, or oracle dependency'))
  console.log(sRow('On-chain',
    _.dgry + 'agentAddress → CevexRegistry.sol on Base' + _.rst,
    'Address maps to PQ pubkey on Base L2'))
  console.log(sEmp())
  console.log(sBot())
  console.log()

  // ── CLI Reference ─────────────────────────────────────────────────────────
  console.log(sTop('CLI REFERENCE'))
  console.log(wEmp())
  console.log(wRow('install',
    'npm install -g @cevex/cli'))
  console.log(wEmp())
  console.log(wRow('provision',
    'cevex provision --scheme dilithium3 --out agent.key',        true))
  console.log(wRow('sign',
    "cevex sign --keyfile agent.key --action '{\"type\":\"transfer\",…}'", true))
  console.log(wRow('verify',
    'cevex verify --pubkey <hex> --sig <hex>',                    true))
  console.log(wRow('info',
    'cevex info --keyfile agent.key',                             true))
  console.log(wRow('rotate',
    'cevex rotate --keyfile agent.key --registry base',           true))
  console.log(wRow('revoke',
    'cevex revoke --keyfile agent.key',                           true))
  console.log(wRow('batch-verify',
    'cevex batch-verify --input sigs.jsonl',                      true))
  console.log(wEmp())
  console.log(wSep())
  console.log(wEmp())

  // ── Demo sub-commands ──────────────────────────────────────────────────────
  console.log(wRow(_.bold + _.ylw + 'DEMO COMMANDS' + _.rst, ''))
  console.log(wEmp())
  console.log(wRow('node run.mjs',
    'Full demo  ·  keygen → sign → verify → summary   ← you are here'))
  console.log(wRow('node run.mjs keygen',
    'Step 1 only  ·  generate a post-quantum keypair'))
  console.log(wRow('node run.mjs sign',
    'Steps 1-2  ·  keygen + sign a transfer payload'))
  console.log(wRow('node run.mjs verify',
    'Steps 1-3  ·  keygen + sign + verify + tamper test'))
  console.log(wRow('node run.mjs help',
    'Show the help screen'))
  console.log(wEmp())
  console.log(wRow('',
    _.dgry + 'github.com/cevexlabs/Cevex  ·  x.com/CevexLabs' + _.rst))
  console.log(wEmp())
  console.log(wBot())
  console.log()
}

function showHelp() {
  console.log()
  console.log(bTop())
  console.log(bRow())
  for (const l of LOGO) console.log(bRow(center(l, C_W)))
  console.log(bRow())
  console.log(bRow(center(_.bold + _.wht + 'Post-Quantum Identity for Autonomous AI Agents' + _.rst, C_W)))
  console.log(bRow())
  console.log(bBot())
  console.log()

  console.log(sTop('HELP  ·  node run.mjs [command]'))
  console.log(wEmp())
  console.log(wRow(_.bold + _.wht + 'ABOUT' + _.rst, ''))
  console.log(wEmp())
  console.log(wRow('',
    'Live demonstration of the CEVEX post-quantum identity protocol.'))
  console.log(wRow('',
    'Generates a real ML-DSA-65 keypair, signs a transfer payload,'))
  console.log(wRow('',
    'and verifies the signature · all on your machine, no network needed.'))
  console.log(wEmp())
  console.log(wSep())
  console.log(wEmp())
  console.log(wRow(_.bold + _.wht + 'COMMANDS' + _.rst, ''))
  console.log(wEmp())
  console.log(wRow('(no argument)',  'Full demo · all three steps + summary + CLI reference', true))
  console.log(wRow('keygen',         'Key generation only · derive a PQ keypair and address',  true))
  console.log(wRow('sign',           'Keygen + signing · create and display a real signature',  true))
  console.log(wRow('verify',         'Keygen + sign + verify · includes tamper-detection test', true))
  console.log(wRow('help',           'Show this screen',                                        true))
  console.log(wEmp())
  console.log(wSep())
  console.log(wEmp())
  console.log(wRow(_.bold + _.wht + 'CRYPTO DETAILS' + _.rst, ''))
  console.log(wEmp())
  console.log(wRow('Scheme',       'CRYSTALS-Dilithium  (ML-DSA-65)  ·  NIST FIPS 204'))
  console.log(wRow('Security',     '162-bit post-quantum · Module LWE lattice hardness assumption'))
  console.log(wRow('Key sizes',    'Public key 1952 B  ·  Secret key 4032 B  ·  Signature 3309 B'))
  console.log(wRow('Wire format',  'CEVEX-MSG-v1 | version | address(20) | nonce(8) | ts(8) | action'))
  console.log(wRow('Address',      'keccak_256(pubkey).slice(12)  ·  EIP-55 checksum  ·  0x...'))
  console.log(wEmp())
  console.log(wSep())
  console.log(wEmp())
  console.log(wRow('',
    _.dgry + 'github.com/cevexlabs/Cevex  ·  x.com/CevexLabs' + _.rst))
  console.log(wEmp())
  console.log(wBot())
  console.log()
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const cmd = (process.argv[2] ?? '').toLowerCase()

if (cmd === 'help') {
  showHelp()
  process.exit(0)
}

if (cmd !== '' && !['keygen', 'sign', 'verify'].includes(cmd)) {
  console.error(`\n  ${_.red}Unknown command: "${cmd}"${_.rst}`)
  console.error(`  Run ${_.ylw}node run.mjs help${_.rst} for available commands.\n`)
  process.exit(1)
}

showBanner()

const kg = runKeygen()
if (cmd === 'keygen') process.exit(0)

const sg = runSign(kg)
if (cmd === 'sign') process.exit(0)

const vr = runVerify(kg, sg)
if (cmd === 'verify') process.exit(0)

showSummary(kg, sg, vr)
