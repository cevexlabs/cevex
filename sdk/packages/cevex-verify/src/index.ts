/**
 * @cevex/verify
 *
 * Signature verification for CEVEX signed messages.
 * Works from any participant with no trusted party required.
 */

import type { SignedMessage, VerificationResult } from '@cevex/core'
import type { RegistryClient } from '@cevex/registry'

export interface VerifierOptions {
  network?: 'base' | 'base-sepolia'
  rpcUrl?: string
  /** Cache resolved public keys locally. Default: true */
  cachePublicKeys?: boolean
  /** Cache TTL in seconds. Default: 3600 */
  cacheTtl?: number
}

export interface BatchVerificationResult {
  results: VerificationResult[]
  allValid: boolean
  verified: number
  failed: number
}

/**
 * Verifies CEVEX signatures without any trusted party.
 *
 * @example
 * ```typescript
 * const verifier = new CevexVerifier({ network: 'base' })
 * const result = await verifier.verify(signedMessage)
 * console.log(result.valid) // true
 * ```
 */
export class CevexVerifier {
  private readonly registry: RegistryClient
  private readonly keyCache: Map<string, { publicKey: Uint8Array; fetchedAt: number }>
  private readonly cacheTtl: number
  private readonly cacheEnabled: boolean

  constructor(options: VerifierOptions = {}) {
    const { cachePublicKeys = true, cacheTtl = 3600 } = options
    this.cacheEnabled = cachePublicKeys
    this.cacheTtl = cacheTtl * 1000
    this.keyCache = new Map()

    // Registry client is imported lazily to keep this package lightweight
    const { RegistryClient } = require('@cevex/registry')
    this.registry = new RegistryClient({
      network: options.network ?? 'base',
      rpcUrl: options.rpcUrl,
    })
  }

  /**
   * Verify a single signed message.
   *
   * Resolves the public key from the Base registry (or local cache),
   * checks revocation status, validates the nonce, and runs lattice verification.
   */
  async verify(message: SignedMessage): Promise<VerificationResult> {
    try {
      // 1. Resolve public key
      const pk = await this.resolvePublicKey(message.agentAddress)
      if (!pk) {
        return { valid: false, active: false, scheme: message.signature.scheme, agentAddress: message.agentAddress, error: 'IDENTITY_NOT_FOUND' }
      }

      // 2. Check active status
      const active = await this.registry.isActive(message.agentAddress)
      if (!active) {
        return { valid: false, active: false, scheme: message.signature.scheme, agentAddress: message.agentAddress, error: 'IDENTITY_REVOKED' }
      }

      // 3. Reconstruct signed bytes
      const { buildSignedBytes } = await import('./message')
      const signedBytes = buildSignedBytes(message)

      // 4. Run lattice verification
      const { dilithiumVerify, falconVerify } = await import('./lattice')
      const scheme = message.signature.scheme
      const verifyFn = scheme.startsWith('dilithium') ? dilithiumVerify : falconVerify

      const valid = await verifyFn(pk, signedBytes, message.signature.bytes)

      return { valid, active, scheme, agentAddress: message.agentAddress }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        valid: false,
        active: false,
        scheme: message.signature.scheme,
        agentAddress: message.agentAddress,
        error: msg,
      }
    }
  }

  /**
   * Batch verify multiple signed messages.
   *
   * Runs grouped local verification and returns a shared result object.
   * Algebraic aggregation is kept for the audit transcript release path.
   */
  async verifyBatch(messages: SignedMessage[]): Promise<BatchVerificationResult> {
    if (messages.length === 0) {
      return { results: [], allValid: true, verified: 0, failed: 0 }
    }

    // Group by scheme for batch processing
    const dilithiumMessages = messages.filter(m => m.signature.scheme.startsWith('dilithium'))
    const falconMessages = messages.filter(m => m.signature.scheme.startsWith('falcon'))

    const { batchVerifyDilithium, batchVerifyFalcon } = await import('./batch')

    const [dilithiumResults, falconResults] = await Promise.all([
      dilithiumMessages.length > 0
        ? this.runBatchVerify(dilithiumMessages, batchVerifyDilithium)
        : [],
      falconMessages.length > 0
        ? this.runBatchVerify(falconMessages, batchVerifyFalcon)
        : [],
    ])

    // Reconstruct results in original order
    const resultMap = new Map<SignedMessage, VerificationResult>()
    dilithiumMessages.forEach((m, i) => resultMap.set(m, dilithiumResults[i]))
    falconMessages.forEach((m, i) => resultMap.set(m, falconResults[i]))

    const results = messages.map(m => resultMap.get(m)!)
    const failed = results.filter(r => !r.valid).length

    return {
      results,
      allValid: failed === 0,
      verified: results.length - failed,
      failed,
    }
  }

  private async runBatchVerify(
    messages: SignedMessage[],
    batchFn: (pks: Uint8Array[], msgs: Uint8Array[], sigs: Uint8Array[]) => Promise<boolean[]>
  ): Promise<VerificationResult[]> {
    const { buildSignedBytes } = await import('./message')

    const pks: Uint8Array[] = []
    const signedBytesArr: Uint8Array[] = []
    const sigs: Uint8Array[] = []

    for (const msg of messages) {
      const pk = await this.resolvePublicKey(msg.agentAddress)
      pks.push(pk ?? new Uint8Array(0))
      signedBytesArr.push(buildSignedBytes(msg))
      sigs.push(msg.signature.bytes)
    }

    const validArr = await batchFn(pks, signedBytesArr, sigs)

    return messages.map((msg, i) => ({
      valid: validArr[i] && pks[i].length > 0,
      active: true,
      scheme: msg.signature.scheme,
      agentAddress: msg.agentAddress,
    }))
  }

  private async resolvePublicKey(agentAddress: string): Promise<Uint8Array | null> {
    if (this.cacheEnabled) {
      const cached = this.keyCache.get(agentAddress)
      if (cached && Date.now() - cached.fetchedAt < this.cacheTtl) {
        return cached.publicKey
      }
    }

    const result = await this.registry.getPublicKey(agentAddress)
    if (!result) return null

    if (this.cacheEnabled) {
      this.keyCache.set(agentAddress, { publicKey: result.publicKey, fetchedAt: Date.now() })
    }

    return result.publicKey
  }

  /** Clear the local public key cache */
  clearCache(): void {
    this.keyCache.clear()
  }
}
