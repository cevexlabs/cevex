/**
 * Keypair derivation for CEVEX agents.
 *
 * Derives deterministic keypairs from conditioned entropy using SHAKE-256,
 * consistent with the CEVEX key generation pipeline:
 *
 *   entropy (raw) → SHAKE-256 conditioning → seed (32 bytes) → KeyGen
 */

import { dilithiumKeyGen } from '@cevex/core'
import { shake256kdf } from '@cevex/core'
import type { KeyPair, SignatureScheme } from '@cevex/core'

/** Context string bound to each key derivation event. */
const KDF_CONTEXT_PREFIX = 'cevex-agent-keygen-v1'

/**
 * Derive a keypair from raw entropy.
 *
 * @param entropy  Raw bytes from sampleEntropy (≥ 32 bytes).
 * @param scheme   Signature scheme to use.
 * @param context  Optional additional context (e.g. agent deployment ID).
 */
export function deriveKeyPair(
  entropy: Uint8Array,
  scheme: SignatureScheme,
  context: string = '',
): KeyPair {
  const fullContext = KDF_CONTEXT_PREFIX + (context ? ':' + context : '')
  const seed = shake256kdf(entropy, fullContext, 32)

  if (scheme === 'dilithium2' || scheme === 'dilithium3' || scheme === 'dilithium5') {
    return dilithiumKeyGen(seed, scheme)
  }

  throw new Error(
    `deriveKeyPair: scheme "${scheme}" is not yet supported. Use dilithium2, dilithium3, or dilithium5.`
  )
}

/**
 * Recover the public key from a stored public key + secret key combination.
 *
 * Note: In ML-DSA (Dilithium), the public key cannot be fully derived from
 * the secret key alone — t1 is not embedded in sk. Always store publicKey
 * alongside secretKey when persisting agent key material.
 */
export function recoverPublicKey(
  publicKey: Uint8Array,
  _secretKey: Uint8Array,
  _scheme: SignatureScheme,
): Uint8Array {
  // Public key is already available — return it directly.
  // This function exists to make the intent explicit and allow future
  // implementations that can derive pk from sk if the scheme supports it.
  return publicKey
}
