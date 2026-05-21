/**
 * Core types for the CEVEX protocol.
 */

/** Supported post-quantum signature schemes */
export type SignatureScheme =
  | 'dilithium2'
  | 'dilithium3'
  | 'dilithium5'
  | 'falcon512'
  | 'falcon1024'

/** Security level matching NIST parameter sets */
export type SecurityLevel = 2 | 3 | 5

/** Entropy source for key generation */
export type EntropySource = 'hardware-qrng' | 'software'

/** A raw keypair produced by KeyGen */
export interface KeyPair {
  publicKey: Uint8Array
  secretKey: Uint8Array
  scheme: SignatureScheme
}

/** A post-quantum signature */
export interface Signature {
  bytes: Uint8Array
  scheme: SignatureScheme
}

/** A signed CEVEX message */
export interface SignedMessage {
  version: number
  agentAddress: string
  nonce: bigint
  timestamp: number
  action: Uint8Array
  signature: Signature
}

/** Result of signature verification */
export interface VerificationResult {
  valid: boolean
  active: boolean
  scheme: SignatureScheme
  agentAddress: string
  error?: string
}

/** Scheme metadata */
export const SCHEME_METADATA: Record<SignatureScheme, {
  publicKeySize: number
  secretKeySize: number
  signatureSize: number
  securityLevel: SecurityLevel
}> = {
  dilithium2:  { publicKeySize: 1312,  secretKeySize: 2528, signatureSize: 2420, securityLevel: 2 },
  dilithium3:  { publicKeySize: 1952,  secretKeySize: 4000, signatureSize: 3293, securityLevel: 3 },
  dilithium5:  { publicKeySize: 2592,  secretKeySize: 4864, signatureSize: 4595, securityLevel: 5 },
  falcon512:   { publicKeySize: 897,   secretKeySize: 1281, signatureSize: 666,  securityLevel: 2 },
  falcon1024:  { publicKeySize: 1793,  secretKeySize: 2305, signatureSize: 1280, securityLevel: 5 },
}

/** Protocol version */
export const PROTOCOL_VERSION = 1

/** Domain separation prefix for signed messages */
export const MSG_DOMAIN_PREFIX = 'CEVEX-MSG-v1'

/** Domain separation prefix for key rotation */
export const ROTATE_DOMAIN_PREFIX = 'CEVEX-ROTATE-v1'

/** Domain separation prefix for revocation */
export const REVOKE_DOMAIN_PREFIX = 'CEVEX-REVOKE-v1'
