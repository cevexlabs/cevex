/**
 * @cevex/agent
 *
 * Agent provisioning, signing, key rotation, and revocation.
 */

import type {
  SignatureScheme,
  EntropySource,
  SignedMessage,
  KeyPair,
} from '@cevex/core'
import type { RegistryClient } from '@cevex/registry'

export interface ProvisionOptions {
  /** Entropy source. Use 'hardware-qrng' in production. */
  entropySource: EntropySource
  /** Post-quantum signing scheme to use. Default: 'dilithium3' */
  scheme?: SignatureScheme
  /** Target network. Default: 'base' */
  network?: 'base' | 'base-sepolia'
  /** Optional JSON metadata to anchor on-chain. */
  metadata?: Record<string, unknown>
  /** Custom RPC URL. If not set, uses the public Base RPC. */
  rpcUrl?: string
  /**
   * Private key (0x-prefixed hex) of the deployer wallet that pays gas
   * for the registerAgent transaction on Base. Required for on-chain registration.
   * If not provided, the agent is provisioned locally without on-chain registration.
   */
  deployerKey?: `0x${string}`
  /** Override the registry contract address. */
  registryAddress?: `0x${string}`
}

export interface ProvisionResult {
  agent: CevexAgent
  txHash: string
  address: string
}

export interface SignOptions {
  /** Arbitrary action payload. Will be encoded as UTF-8 if string. */
  action: Record<string, unknown> | string | Uint8Array
}

export interface RotateKeyOptions {
  entropySource: EntropySource
  reason?: string
}

export interface RevokeOptions {
  reason?: string
}

/**
 * A provisioned CEVEX agent capable of signing messages.
 *
 * @example
 * ```typescript
 * const { agent } = await CevexAgent.provision({
 *   entropySource: 'software',
 *   scheme: 'dilithium3',
 *   network: 'base-sepolia',
 *   deployerKey: process.env.DEPLOYER_KEY as `0x${string}`,
 * })
 *
 * const signed = await agent.sign({ action: { transfer: '100' } })
 * ```
 */
export class CevexAgent {
  readonly address: string
  readonly scheme: SignatureScheme
  readonly network: string

  private keyPair: KeyPair
  private readonly registry: RegistryClient
  private nonce: bigint

  private constructor(
    address: string,
    keyPair: KeyPair,
    registry: RegistryClient,
    network: string,
    nonce: bigint = 0n,
  ) {
    this.address = address
    this.scheme = keyPair.scheme
    this.keyPair = keyPair
    this.registry = registry
    this.network = network
    this.nonce = nonce
  }

  /**
   * Provision a new agent identity.
   *
   * Generates a quantum-entropy keypair and (if a deployerKey is provided)
   * registers it on Base.
   */
  static async provision(options: ProvisionOptions): Promise<CevexAgent> {
    const {
      entropySource,
      scheme = 'dilithium3',
      network = 'base',
      metadata,
      rpcUrl,
      deployerKey,
      registryAddress,
    } = options

    // 1. Sample entropy and derive keypair
    const { sampleEntropy } = await import('./entropy')
    const { deriveKeyPair } = await import('./keygen')
    const entropy = await sampleEntropy(entropySource)
    const keyPair = deriveKeyPair(entropy, scheme)

    // 2. Derive on-chain address
    const { deriveAddress } = await import('./address')
    const address = deriveAddress(keyPair.publicKey)

    // 3. Create registry client
    const { RegistryClient } = await import('@cevex/registry')
    const registry = new RegistryClient({
      network,
      rpcUrl,
      privateKey: deployerKey,
      registryAddress,
    })

    // 4. Register on Base (only if a deployer key is available)
    if (deployerKey) {
      const metadataHash = metadata
        ? await registry.uploadMetadata(metadata)
        : ('0x' + '00'.repeat(32)) as `0x${string}`

      await registry.registerAgent({
        publicKey: keyPair.publicKey,
        scheme,
        metadataHash,
      })
    }

    return new CevexAgent(address, keyPair, registry, network)
  }

  /**
   * Load an existing agent from stored key material.
   *
   * Use this to restore an agent after a restart.
   * Both publicKey and secretKey must be provided, ML-DSA does not allow
   * recovering the public key from the secret key alone.
   */
  static async fromKeyPair(
    keyPair: KeyPair,
    options: { network?: string; rpcUrl?: string; deployerKey?: `0x${string}`; registryAddress?: `0x${string}` } = {},
  ): Promise<CevexAgent> {
    const { deriveAddress } = await import('./address')
    const { RegistryClient } = await import('@cevex/registry')

    const address = deriveAddress(keyPair.publicKey)

    const registry = new RegistryClient({
      network: options.network ?? 'base',
      rpcUrl: options.rpcUrl,
      privateKey: options.deployerKey,
      registryAddress: options.registryAddress,
    })

    const { lastNonce } = await registry.getAgentState(address)
    return new CevexAgent(address, keyPair, registry, options.network ?? 'base', lastNonce)
  }

  /**
   * @deprecated Use fromKeyPair() instead.
   *
   * Preserved for backwards compatibility. Requires both secretKey and publicKey
   * because ML-DSA does not embed the full public key in the secret key.
   */
  static async fromSecretKey(
    secretKey: Uint8Array,
    publicKey: Uint8Array,
    scheme: SignatureScheme,
    options: { network?: string; rpcUrl?: string; deployerKey?: `0x${string}`; registryAddress?: `0x${string}` } = {},
  ): Promise<CevexAgent> {
    return CevexAgent.fromKeyPair({ publicKey, secretKey, scheme }, options)
  }

  /**
   * Sign a message as this agent.
   * Returns a SignedMessage ready for broadcast and verification.
   */
  async sign(options: SignOptions): Promise<SignedMessage> {
    const { encodeAction, buildSignedBytes } = await import('./message')
    const { dilithiumSign, falconSign } = await import('./signing')

    const action = encodeAction(options.action)
    const nonce = ++this.nonce
    const timestamp = Date.now()

    const signedBytes = buildSignedBytes({
      version: 1,
      agentAddress: this.address,
      nonce,
      timestamp,
      action,
    })

    const signFn = this.scheme.startsWith('dilithium') ? dilithiumSign : falconSign
    const sigBytes = signFn(this.keyPair.secretKey, signedBytes)

    return {
      version: 1,
      agentAddress: this.address,
      nonce,
      timestamp,
      action,
      signature: { bytes: sigBytes, scheme: this.scheme },
    }
  }

  /**
   * Rotate this agent's keypair.
   *
   * Derives a fresh keypair from new quantum entropy and (if a deployer key
   * was configured) submits a rotation transaction to the Base registry.
   * The agent's on-chain address does not change.
   */
  async rotateKey(options: RotateKeyOptions): Promise<{ rotationTxHash: string }> {
    const { sampleEntropy } = await import('./entropy')
    const { deriveKeyPair } = await import('./keygen')
    const { buildSignedBytes } = await import('./message')
    const { dilithiumSign } = await import('./signing')

    const entropy = await sampleEntropy(options.entropySource)
    const newKeyPair = deriveKeyPair(entropy, this.scheme)

    // Sign rotation authorization with current key
    const rotationBytes = buildSignedBytes({
      version: 1,
      agentAddress: this.address,
      nonce: ++this.nonce,
      timestamp: Date.now(),
      action: new TextEncoder().encode(
        'CEVEX-ROTATE-v1:' + Buffer.from(newKeyPair.publicKey).toString('hex')
      ),
    })

    const rotationSig = dilithiumSign(this.keyPair.secretKey, rotationBytes)

    const { txHash } = await this.registry.rotateKey({
      agentAddress: this.address as `0x${string}`,
      newPublicKey: newKeyPair.publicKey,
      rotationSignature: rotationSig,
    })

    // Update internal state
    this.keyPair = newKeyPair

    return { rotationTxHash: txHash }
  }

  /**
   * Permanently revoke this agent identity. This action is irreversible.
   */
  async revoke(options: RevokeOptions = {}): Promise<{ txHash: string }> {
    const { buildSignedBytes } = await import('./message')
    const { dilithiumSign } = await import('./signing')

    const revokeBytes = buildSignedBytes({
      version: 1,
      agentAddress: this.address,
      nonce: ++this.nonce,
      timestamp: Date.now(),
      action: new TextEncoder().encode('CEVEX-REVOKE-v1:' + (options.reason ?? '')),
    })

    const revokeSig = dilithiumSign(this.keyPair.secretKey, revokeBytes)

    return this.registry.revokeAgent({
      agentAddress: this.address as `0x${string}`,
      revocationSignature: revokeSig,
    })
  }

  /**
   * Export the current key material for persistence.
   * Store the result securely, the secretKey is the root of agent identity.
   */
  exportKeyPair(): KeyPair {
    return {
      publicKey: new Uint8Array(this.keyPair.publicKey),
      secretKey: new Uint8Array(this.keyPair.secretKey),
      scheme: this.keyPair.scheme,
    }
  }
}
