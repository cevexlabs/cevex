/**
 * Message byte reconstruction for the verifier.
 *
 * Duplicates the canonical encoding from @cevex/agent/src/message.ts.
 * Both implementations must produce identical output — any divergence
 * will cause verification to fail. They are kept in sync manually.
 *
 * Wire format (all integers big-endian):
 *
 *   Field         | Bytes | Description
 *   --------------|-------|------------------------------------------
 *   prefix        |  13   | ASCII "CEVEX-MSG-v1"
 *   version       |   1   | Protocol version (currently 0x01)
 *   agentAddress  |  20   | Raw agent address bytes
 *   nonce         |   8   | Monotonic uint64, big-endian
 *   timestamp     |   8   | Unix epoch in milliseconds, uint64, big-endian
 *   actionLen     |   4   | uint32 length of action payload
 *   action        |   N   | Raw action payload bytes
 */

import { MSG_DOMAIN_PREFIX, PROTOCOL_VERSION } from '@cevex/core'
import type { SignedMessage } from '@cevex/core'

const PREFIX_BYTES = new TextEncoder().encode(MSG_DOMAIN_PREFIX)

/**
 * Reconstruct the canonical signed byte sequence from a SignedMessage.
 * Must produce the same output as buildSignedBytes() on the signer side.
 */
export function buildSignedBytes(msg: SignedMessage): Uint8Array {
  const version = msg.version ?? PROTOCOL_VERSION
  const addrBytes = hexToBytes(msg.agentAddress)

  const totalLen = PREFIX_BYTES.length + 1 + 20 + 8 + 8 + 4 + msg.action.length
  const buf = new Uint8Array(totalLen)
  let offset = 0

  buf.set(PREFIX_BYTES, offset)
  offset += PREFIX_BYTES.length

  buf[offset++] = version & 0xff

  buf.set(addrBytes, offset)
  offset += 20

  writeUint64BE(buf, offset, msg.nonce)
  offset += 8

  writeUint64BE(buf, offset, BigInt(msg.timestamp))
  offset += 8

  const actionLen = msg.action.length
  buf[offset++] = (actionLen >>> 24) & 0xff
  buf[offset++] = (actionLen >>> 16) & 0xff
  buf[offset++] = (actionLen >>> 8)  & 0xff
  buf[offset++] = (actionLen)        & 0xff

  buf.set(msg.action, offset)

  return buf
}

function writeUint64BE(buf: Uint8Array, offset: number, value: bigint): void {
  const hi = Number((value >> 32n) & 0xffffffffn)
  const lo = Number(value & 0xffffffffn)
  buf[offset]     = (hi >>> 24) & 0xff
  buf[offset + 1] = (hi >>> 16) & 0xff
  buf[offset + 2] = (hi >>> 8)  & 0xff
  buf[offset + 3] = hi & 0xff
  buf[offset + 4] = (lo >>> 24) & 0xff
  buf[offset + 5] = (lo >>> 16) & 0xff
  buf[offset + 6] = (lo >>> 8)  & 0xff
  buf[offset + 7] = lo & 0xff
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(20)
  for (let i = 0; i < 20; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
