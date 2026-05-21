/**
 * CRYSTALS-Dilithium (ML-DSA) bindings.
 *
 * Wraps @noble/post-quantum ml-dsa implementations for all three NIST
 * parameter sets (ML-DSA-44 / -65 / -87), corresponding to CEVEX security
 * levels 2, 3, and 5 respectively.
 *
 * FIPS 204 standardized name: ML-DSA
 * CEVEX protocol name: CRYSTALS-Dilithium
 */

import { ml_dsa44, ml_dsa65, ml_dsa87 } from '@noble/post-quantum/ml-dsa'
import type { SignatureScheme, KeyPair } from './types'

type DilithiumScheme = Extract<SignatureScheme, 'dilithium2' | 'dilithium3' | 'dilithium5'>

const IMPL = {
  dilithium2: ml_dsa44,
  dilithium3: ml_dsa65,
  dilithium5: ml_dsa87,
} as const

function assertDilithium(scheme: SignatureScheme): DilithiumScheme {
  if (!(scheme in IMPL)) {
    throw new Error(`Not a Dilithium scheme: ${scheme}`)
  }
  return scheme as DilithiumScheme
}

/**
 * Generate a Dilithium keypair from a 32-byte seed.
 *
 * The seed must be uniformly random. Use sampleEntropy() + shake256kdf()
 * to derive the seed from quantum entropy.
 */
export function dilithiumKeyGen(seed: Uint8Array, scheme: DilithiumScheme): KeyPair {
  if (seed.length !== 32) {
    throw new Error(`dilithiumKeyGen: seed must be 32 bytes, got ${seed.length}`)
  }
  const impl = IMPL[scheme]
  const { publicKey, secretKey } = impl.keygen(seed)
  return {
    publicKey: new Uint8Array(publicKey),
    secretKey: new Uint8Array(secretKey),
    scheme,
  }
}

/**
 * Sign a message with a Dilithium secret key.
 *
 * Returns the raw signature bytes. The signature includes the challenge
 * polynomial c and response vector z produced by the abort-and-resample
 * rejection sampling loop.
 */
export function dilithiumSign(
  secretKey: Uint8Array,
  message: Uint8Array,
  scheme: DilithiumScheme,
): Uint8Array {
  const impl = IMPL[assertDilithium(scheme)]
  return new Uint8Array(impl.sign(secretKey, message))
}

/**
 * Verify a Dilithium signature.
 *
 * Returns true if the signature is a valid Dilithium signature on message
 * under publicKey. Returns false for any invalid input without throwing.
 */
export function dilithiumVerify(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
  scheme: DilithiumScheme,
): boolean {
  try {
    const impl = IMPL[assertDilithium(scheme)]
    return impl.verify(publicKey, message, signature)
  } catch {
    return false
  }
}

export type { DilithiumScheme }
