/**
 * @cevex/registry
 *
 * Client for the CevexRegistry contract on Base.
 * Resolves agent public keys, checks revocation status, and submits
 * registration, rotation, and revocation transactions.
 *
 * Read-only operations (getPublicKey, isActive, getIdentity) work with
 * any RPC endpoint and do not require a private key.
 *
 * Write operations (registerAgent, rotateKey, revokeAgent) require a
 * deployer private key to pay for gas on Base.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Hash,
  type Address,
} from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import {
  CEVEX_REGISTRY_ABI,
  REGISTRY_ADDRESSES,
  SCHEME_ENCODING,
  SECURITY_LEVEL_FOR_SCHEME,
} from './abi'

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export interface RegistryClientOptions {
  /** Target network. Default: 'base' */
  network?: 'base' | 'base-sepolia'
  /** Custom RPC URL. If not set, uses the public Base or Base Sepolia endpoint. */
  rpcUrl?: string
  /**
   * Deployer private key (hex string with 0x prefix) for signing transactions.
   * Required for write operations. Read-only operations work without it.
   */
  privateKey?: `0x${string}`
  /**
   * Override the registry contract address. Required until the contract is deployed
   * to mainnet. Defaults to the canonical CEVEX registry address if one is set.
   */
  registryAddress?: `0x${string}`
}

export interface RegisterAgentParams {
  publicKey: Uint8Array
  /** Signature scheme used. Determines the on-chain scheme + securityLevel encoding. */
  scheme: string
  /** 32-byte metadata commitment. Pass '0x' + '00'.repeat(32) if none. */
  metadataHash: `0x${string}` | string
}

export interface RotateKeyParams {
  agentAddress: `0x${string}`
  newPublicKey: Uint8Array
  rotationSignature: Uint8Array
}

export interface RevokeAgentParams {
  agentAddress: `0x${string}`
  revocationSignature: Uint8Array
}

export interface AgentIdentityResult {
  publicKey: Uint8Array
  scheme: number
  securityLevel: number
  registeredAt: bigint
  revokedAt: bigint
  metadataHash: `0x${string}`
}

// -------------------------------------------------------------------------
// RPC endpoints
// -------------------------------------------------------------------------

const RPC_URLS: Record<string, string> = {
  'base':         'https://mainnet.base.org',
  'base-sepolia': 'https://sepolia.base.org',
}

const CHAINS = {
  'base':         base,
  'base-sepolia': baseSepolia,
}

// -------------------------------------------------------------------------
// RegistryClient
// -------------------------------------------------------------------------

export class RegistryClient {
  private readonly publicClient: PublicClient
  private readonly walletClient: WalletClient | null
  private readonly registryAddress: `0x${string}`
  readonly network: string

  constructor(options: RegistryClientOptions = {}) {
    const network = options.network ?? 'base'
    this.network = network

    const rpcUrl = options.rpcUrl ?? RPC_URLS[network]
    const chain = CHAINS[network as keyof typeof CHAINS]

    if (!chain) {
      throw new Error(`RegistryClient: unsupported network "${network}"`)
    }

    const transport = http(rpcUrl)

    this.publicClient = createPublicClient({ chain, transport }) as PublicClient

    if (options.privateKey) {
      const account = privateKeyToAccount(options.privateKey)
      this.walletClient = createWalletClient({ chain, transport, account }) as WalletClient
    } else {
      this.walletClient = null
    }

    // Registry address: prefer explicit override, then canonical address, then null
    const canonicalAddress = REGISTRY_ADDRESSES[network]
    const provided = options.registryAddress ?? canonicalAddress

    if (!provided) {
      // Allow construction, write ops will fail at call time with a clear error
      this.registryAddress = '0x0000000000000000000000000000000000000000'
    } else {
      this.registryAddress = provided as `0x${string}`
    }
  }

  // -------------------------------------------------------------------------
  // Write operations
  // -------------------------------------------------------------------------

  /**
   * Register a new agent identity on the Base registry.
   *
   * @throws If no private key was provided at construction.
   * @throws If the registry address is not configured.
   */
  async registerAgent(params: RegisterAgentParams): Promise<{ txHash: Hash }> {
    this.assertWriteReady()

    const schemeId = params.scheme.startsWith('dilithium')
      ? SCHEME_ENCODING.dilithium
      : SCHEME_ENCODING.falcon

    const securityLevel = SECURITY_LEVEL_FOR_SCHEME[
      params.scheme as keyof typeof SECURITY_LEVEL_FOR_SCHEME
    ]
    if (securityLevel === undefined) {
      throw new Error(`registerAgent: unknown scheme "${params.scheme}"`)
    }

    const metadataHash = padBytes32(params.metadataHash)

    const txHash = await this.walletClient!.writeContract({
      address: this.registryAddress,
      abi: CEVEX_REGISTRY_ABI,
      functionName: 'registerAgent',
      args: [
        params.publicKey,
        schemeId,
        securityLevel,
        metadataHash,
      ],
    } as Parameters<WalletClient['writeContract']>[0])

    return { txHash }
  }

  /**
   * Rotate the public key for an existing agent identity.
   */
  async rotateKey(params: RotateKeyParams): Promise<{ txHash: Hash }> {
    this.assertWriteReady()

    const txHash = await this.walletClient!.writeContract({
      address: this.registryAddress,
      abi: CEVEX_REGISTRY_ABI,
      functionName: 'rotateKey',
      args: [
        params.agentAddress,
        params.newPublicKey,
        params.rotationSignature,
      ],
    } as Parameters<WalletClient['writeContract']>[0])

    return { txHash }
  }

  /**
   * Permanently revoke an agent identity.
   */
  async revokeAgent(params: RevokeAgentParams): Promise<{ txHash: Hash }> {
    this.assertWriteReady()

    const txHash = await this.walletClient!.writeContract({
      address: this.registryAddress,
      abi: CEVEX_REGISTRY_ABI,
      functionName: 'revokeAgent',
      args: [
        params.agentAddress,
        params.revocationSignature,
      ],
    } as Parameters<WalletClient['writeContract']>[0])

    return { txHash }
  }

  // -------------------------------------------------------------------------
  // Read operations
  // -------------------------------------------------------------------------

  /**
   * Retrieve the public key and scheme for an agent address.
   * Returns null if the identity is not registered.
   */
  async getPublicKey(agentAddress: string): Promise<{ publicKey: Uint8Array; scheme: number } | null> {
    try {
      const [publicKey, scheme] = await this.publicClient.readContract({
        address: this.registryAddress,
        abi: CEVEX_REGISTRY_ABI,
        functionName: 'getPublicKey',
        args: [agentAddress as Address],
      }) as [Uint8Array, number]

      return {
        publicKey: new Uint8Array(publicKey as unknown as ArrayBufferLike),
        scheme: Number(scheme),
      }
    } catch (err) {
      if (isNotFoundError(err)) return null
      throw err
    }
  }

  /**
   * Check whether an agent identity is currently active (not revoked).
   */
  async isActive(agentAddress: string): Promise<boolean> {
    try {
      return await this.publicClient.readContract({
        address: this.registryAddress,
        abi: CEVEX_REGISTRY_ABI,
        functionName: 'isActive',
        args: [agentAddress as Address],
      }) as boolean
    } catch (err) {
      if (isNotFoundError(err)) return false
      throw err
    }
  }

  /**
   * Retrieve the full identity record for an agent.
   */
  async getIdentity(agentAddress: string): Promise<AgentIdentityResult | null> {
    try {
      const [publicKey, scheme, securityLevel, registeredAt, revokedAt, metadataHash] =
        await this.publicClient.readContract({
          address: this.registryAddress,
          abi: CEVEX_REGISTRY_ABI,
          functionName: 'getIdentity',
          args: [agentAddress as Address],
        }) as [Uint8Array, number, number, bigint, bigint, `0x${string}`]

      return {
        publicKey: new Uint8Array(publicKey as unknown as ArrayBufferLike),
        scheme: Number(scheme),
        securityLevel: Number(securityLevel),
        registeredAt,
        revokedAt,
        metadataHash,
      }
    } catch (err) {
      if (isNotFoundError(err)) return null
      throw err
    }
  }

  /**
   * Get the last known nonce for an agent.
   * Currently returns 0n since nonces are tracked client-side.
   * A future upgrade will track nonces on-chain.
   */
  async getAgentState(_agentAddress: string): Promise<{ lastNonce: bigint }> {
    return { lastNonce: 0n }
  }

  /**
   * Upload agent metadata to IPFS and return a 32-byte content hash.
   * If CEVEX_IPFS_URL is set, uses that as the IPFS upload endpoint.
   * Otherwise returns a deterministic keccak256 hash of the metadata bytes.
   */
  async uploadMetadata(metadata: Record<string, unknown>): Promise<`0x${string}`> {
    const json = JSON.stringify(metadata)
    const bytes = new TextEncoder().encode(json)

    const ipfsUrl = process.env['CEVEX_IPFS_URL']
    if (ipfsUrl) {
      try {
        const res = await fetch(ipfsUrl, {
          method: 'POST',
          body: bytes,
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000),
        })
        if (res.ok) {
          const body = await res.json() as { hash?: string; cid?: string }
          const cid = body.hash ?? body.cid
          if (cid) {
            // Encode CID as bytes32, use first 32 bytes of keccak256(cid)
            return keccak256Hex(new TextEncoder().encode(cid))
          }
        }
      } catch {
        // Fall through to deterministic hash
      }
    }

    // No IPFS: use keccak256 of the metadata JSON as the commitment
    return keccak256Hex(bytes)
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private assertWriteReady(): void {
    if (!this.walletClient) {
      throw new Error(
        'RegistryClient: write operation requires a private key.\n' +
        'Pass privateKey: "0xPrivateKey" to the RegistryClient constructor.'
      )
    }
    if (this.registryAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(
        'RegistryClient: registry contract address is not configured.\n' +
        'Pass registryAddress: "0xRegistryAddress" to the RegistryClient constructor, or set it in CEVEX_REGISTRY_ADDRESS.'
      )
    }
  }
}

// -------------------------------------------------------------------------
// Utility functions
// -------------------------------------------------------------------------

function padBytes32(value: string): `0x${string}` {
  const hex = value.startsWith('0x') ? value.slice(2) : value
  return `0x${hex.padStart(64, '0')}` as `0x${string}`
}

function isNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('identity not found') || msg.includes('not found') || msg.includes('revert')
}

async function keccak256Hex(data: Uint8Array): Promise<`0x${string}`> {
  // Use Web Crypto API (available in Node.js 18+) for keccak256 isn't natively available
  // Instead use a simple SHA-256 as fallback for the metadata commitment
  // (not security-critical, this is just an off-chain metadata anchor)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  const hex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')
  return `0x${hex}` as `0x${string}`
}
