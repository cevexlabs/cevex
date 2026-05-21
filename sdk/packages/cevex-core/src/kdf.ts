/**
 * Key derivation function.
 *
 * Uses SHAKE-256 (XOF) as the conditioning function, consistent with
 * NIST SP 800-90B requirements for entropy conditioning before key derivation.
 *
 * SHAKE-256 provides variable-length output derived from the input material.
 * A context string binds derivation to a specific provisioning event,
 * preventing key reuse across different agents or deployments.
 */

import { shake256 } from '@noble/hashes/sha3'
import { concatBytes } from '@noble/hashes/utils'

/**
 * Derive a seed for key generation from raw entropy.
 *
 * @param entropy   Raw entropy bytes from the QRNG or OS CSPRNG (≥ 32 bytes recommended).
 * @param context   Context string binding derivation to a specific event (e.g. agent ID).
 * @param outputLen Output length in bytes. Default: 32 (256 bits).
 */
export function shake256kdf(
  entropy: Uint8Array,
  context: string,
  outputLen: number = 32,
): Uint8Array {
  const ctxBytes = new TextEncoder().encode(context)
  const input = concatBytes(entropy, ctxBytes)
  return shake256(input, { dkLen: outputLen })
}

/**
 * Hash arbitrary bytes with SHAKE-256.
 *
 * @param data      Input bytes.
 * @param outputLen Output length in bytes. Default: 32.
 */
export function shake256Hash(data: Uint8Array, outputLen: number = 32): Uint8Array {
  return shake256(data, { dkLen: outputLen })
}
