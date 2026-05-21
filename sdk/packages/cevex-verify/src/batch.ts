/**
 * Batch verification.
 *
 * Runs individual verifications concurrently. All verifications are independent
 * A failure in one does not abort the others.
 *
 * Note on batch optimization: true algebraic batch verification for ML-DSA
 * (randomized linear combination over the challenge polynomial) requires access
 * to internal scheme state that is not exposed by @noble/post-quantum. This
 * implementation runs individual verifications in parallel, which provides
 * I/O concurrency. The interface is defined now to support audited algebraic
 * batch primitives when the underlying library exposes them.
 */

import { dilithiumVerify as coreVerify } from '@cevex/core'

/**
 * Batch verify Dilithium signatures.
 *
 * @param publicKeys   One public key per message.
 * @param messages     One message per signature.
 * @param signatures   One signature per message.
 * @returns            Array of booleans, true if the corresponding sig is valid.
 */
export async function batchVerifyDilithium(
  publicKeys: Uint8Array[],
  messages: Uint8Array[],
  signatures: Uint8Array[],
): Promise<boolean[]> {
  if (publicKeys.length !== messages.length || messages.length !== signatures.length) {
    throw new Error('batchVerifyDilithium: input arrays must have the same length')
  }

  return Promise.all(
    publicKeys.map((pk, i) => {
      if (pk.length === 0) return Promise.resolve(false)
      // Try all three Dilithium parameter sets, the correct one matches the pk size
      return Promise.resolve(
        coreVerify(pk, messages[i], signatures[i], 'dilithium2') ||
        coreVerify(pk, messages[i], signatures[i], 'dilithium3') ||
        coreVerify(pk, messages[i], signatures[i], 'dilithium5'),
      )
    }),
  )
}

/**
 * Batch verify FALCON signatures.
 *
 * @throws Always, FALCON batch verification is reserved for the audited secondary release.
 */
export async function batchVerifyFalcon(
  _publicKeys: Uint8Array[],
  _messages: Uint8Array[],
  _signatures: Uint8Array[],
): Promise<boolean[]> {
  throw new Error('batchVerifyFalcon: FALCON verification is reserved for the audited secondary release.')
}
