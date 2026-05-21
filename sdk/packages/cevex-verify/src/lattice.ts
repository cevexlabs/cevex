/**
 * Lattice verification dispatch.
 *
 * Selects the correct verification function based on scheme name.
 * Used by both single-message and batch verification paths.
 */

import { dilithiumVerify as coreVerify } from '@cevex/core'
import type { SignatureScheme } from '@cevex/core'

/**
 * Verify a post-quantum signature.
 *
 * @param publicKey  Public key bytes for the agent.
 * @param message    Canonical signed bytes (from buildSignedBytes).
 * @param signature  Signature bytes to verify.
 * @param scheme     Signature scheme declared in the SignedMessage.
 * @returns          true if signature is valid, false otherwise.
 */
export function verifySignature(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
  scheme: SignatureScheme,
): boolean {
  if (scheme === 'dilithium2' || scheme === 'dilithium3' || scheme === 'dilithium5') {
    return coreVerify(publicKey, message, signature, scheme)
  }

  if (scheme === 'falcon512' || scheme === 'falcon1024') {
    throw new Error(
      `verifySignature(${scheme}): FALCON verification is reserved for the audited secondary release.`
    )
  }

  throw new Error(`verifySignature: unknown scheme "${scheme}"`)
}

/**
 * Named exports matching the dynamic import pattern used in index.ts:
 *   const { dilithiumVerify, falconVerify } = await import('./lattice')
 */
export function dilithiumVerify(
  pk: Uint8Array,
  msg: Uint8Array,
  sig: Uint8Array,
): boolean {
  // Scheme is determined at call site, use dilithium3 as fallback when
  // called from the verifier without scheme context (legacy path)
  return (
    coreVerify(pk, msg, sig, 'dilithium2') ||
    coreVerify(pk, msg, sig, 'dilithium3') ||
    coreVerify(pk, msg, sig, 'dilithium5')
  )
}

export function falconVerify(
  _pk: Uint8Array,
  _msg: Uint8Array,
  _sig: Uint8Array,
): boolean {
  throw new Error('FALCON verification is reserved for the audited secondary release.')
}
