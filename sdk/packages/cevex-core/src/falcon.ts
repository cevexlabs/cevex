/**
 * FALCON (FN-DSA) bindings.
 *
 * FALCON is the reserved secondary signing scheme in CEVEX. It produces smaller
 * signatures (666 bytes at level 2) than Dilithium, making it preferable
 * for high-frequency, bandwidth-constrained agents.
 *
 * FIPS 206 standardized name: FN-DSA
 * CEVEX protocol name: FALCON
 *
 * Status: FALCON support is reserved until a stable, audited TypeScript
 * implementation is available. The interface is defined now so callers can
 * rely on the API shape.
 *
 * Use 'dilithium3' for production workloads.
 */

import type { SignatureScheme, KeyPair } from './types'

type FalconScheme = Extract<SignatureScheme, 'falcon512' | 'falcon1024'>

const FALCON_RESERVED =
  'FALCON support is reserved for the audited secondary release. Use dilithium3 for production workloads. ' +
  'Track https://github.com/cevexlabs/Cevex/issues for FALCON release status.'

/**
 * @throws Always, FALCON is reserved for the audited secondary release.
 */
export function falconKeyGen(_seed: Uint8Array, scheme: FalconScheme): KeyPair {
  throw new Error(`falconKeyGen(${scheme}): ${FALCON_RESERVED}`)
}

/**
 * @throws Always, FALCON is reserved for the audited secondary release.
 */
export function falconSign(
  _secretKey: Uint8Array,
  _message: Uint8Array,
  scheme: FalconScheme,
): Uint8Array {
  throw new Error(`falconSign(${scheme}): ${FALCON_RESERVED}`)
}

/**
 * @throws Always, FALCON is reserved for the audited secondary release.
 */
export function falconVerify(
  _publicKey: Uint8Array,
  _message: Uint8Array,
  _signature: Uint8Array,
  scheme: FalconScheme,
): boolean {
  throw new Error(`falconVerify(${scheme}): ${FALCON_RESERVED}`)
}

export type { FalconScheme }
