/**
 * Signed message encoding.
 *
 * Defines the canonical byte layout that is passed to the signing function.
 * Any implementation that reconstructs the same bytes can verify a CEVEX signature.
 *
 * Wire format (all integers big-endian):
 *
 *   Field         | Bytes | Description
 *   --------------|-------|------------------------------------------
 *   prefix        |  13   | ASCII "CEVEX-MSG-v1"
 *   version       |   1   | Protocol version (currently 0x01)
 *   agentAddress  |  20   | Raw agent address bytes (no 0x prefix)
 *   nonce         |   8   | Monotonic uint64, big-endian
 *   timestamp     |   8   | Unix epoch in milliseconds, uint64, big-endian
 *   actionLen     |   4   | uint32 length of action payload
 *   action        |   N   | Raw action payload bytes
 */

import { MSG_DOMAIN_PREFIX, PROTOCOL_VERSION } from '@cevex/core'

export interface MessageFields {
  version?: number
  agentAddress: string
  nonce: bigint
  timestamp: number
  action: Uint8Array
}

const PREFIX_BYTES = new TextEncoder().encode(MSG_DOMAIN_PREFIX)

/**
 * Build the canonical byte sequence that is passed to Sign() and Verify().
 *
 * This function must produce identical output on the signer side and the
 * verifier side. Any deviation (e.g. different timestamp encoding) will
 * cause verification to fail.
 */
export function buildSignedBytes(fields: MessageFields): Uint8Array {
  const version = fields.version ?? PROTOCOL_VERSION
  const addrBytes = hexToBytes(fields.agentAddress)

  // Calculate total length
  const totalLen = PREFIX_BYTES.length + 1 + 20 + 8 + 8 + 4 + fields.action.length
  const buf = new Uint8Array(totalLen)
  let offset = 0

  // Domain prefix: "CEVEX-MSG-v1" (13 bytes)
  buf.set(PREFIX_BYTES, offset)
  offset += PREFIX_BYTES.length

  // Version: 1 byte
  buf[offset++] = version & 0xff

  // Agent address: 20 bytes
  if (addrBytes.length !== 20) {
    throw new Error(`buildSignedBytes: agentAddress must be 20 bytes, got ${addrBytes.length}`)
  }
  buf.set(addrBytes, offset)
  offset += 20

  // Nonce: 8 bytes, big-endian uint64
  writeUint64BE(buf, offset, fields.nonce)
  offset += 8

  // Timestamp: 8 bytes, big-endian uint64
  writeUint64BE(buf, offset, BigInt(fields.timestamp))
  offset += 8

  // Action length: 4 bytes, big-endian uint32
  const actionLen = fields.action.length
  buf[offset++] = (actionLen >>> 24) & 0xff
  buf[offset++] = (actionLen >>> 16) & 0xff
  buf[offset++] = (actionLen >>> 8)  & 0xff
  buf[offset++] = (actionLen)        & 0xff

  // Action payload
  buf.set(fields.action, offset)

  return buf
}

/**
 * Encode an action payload to bytes.
 *
 * - Uint8Array: returned as-is.
 * - string:     UTF-8 encoded.
 * - object:     JSON stringified, then UTF-8 encoded.
 */
export function encodeAction(
  action: Record<string, unknown> | string | Uint8Array,
): Uint8Array {
  if (action instanceof Uint8Array) return action
  if (typeof action === 'string') return new TextEncoder().encode(action)
  return new TextEncoder().encode(JSON.stringify(action))
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

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
  if (clean.length !== 40) {
    throw new Error(`hexToBytes: expected 40-char address hex, got "${hex}"`)
  }
  const bytes = new Uint8Array(20)
  for (let i = 0; i < 20; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
