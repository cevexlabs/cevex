/**
 * Per-scheme signing dispatch.
 *
 * Selects the correct signing function based on scheme name and
 * delegates to the corresponding implementation in @cevex/core.
 */

import { dilithiumSign as coreSign } from '@cevex/core'
import type { SignatureScheme } from '@cevex/core'

/**
 * Sign a byte payload with the given secret key and scheme.
 *
 * @param secretKey   Serialized secret key (scheme-specific length).
 * @param message     Canonical signed bytes from buildSignedBytes().
 * @param scheme      Signature scheme used when the keypair was generated.
 * @returns           Raw signature bytes.
 */
export function signMessage(
  secretKey: Uint8Array,
  message: Uint8Array,
  scheme: SignatureScheme,
): Uint8Array {
  if (scheme === 'dilithium2' || scheme === 'dilithium3' || scheme === 'dilithium5') {
    return coreSign(secretKey, message, scheme)
  }

  if (scheme === 'falcon512' || scheme === 'falcon1024') {
    throw new Error(
      `signMessage(${scheme}): FALCON signing is not yet available. ` +
      'Use dilithium3 for production workloads.'
    )
  }

  throw new Error(`signMessage: unknown scheme "${scheme}"`)
}

/**
 * Named exports to match the dynamic import pattern used in index.ts:
 *   const { dilithiumSign, falconSign } = await import('./signing')
 *
 * dilithiumSign: signs using the scheme embedded in the agent (defaults to dilithium3
 * for the rotation/revocation helpers that call it without a scheme argument).
 */
export function dilithiumSign(sk: Uint8Array, msg: Uint8Array): Uint8Array {
  // Called from index.ts rotation/revocation helpers where scheme is always dilithium
  return coreSign(sk, msg, 'dilithium3')
}

export function falconSign(_sk: Uint8Array, _msg: Uint8Array): Uint8Array {
  throw new Error('FALCON signing is not yet available. Use dilithium3.')
}
