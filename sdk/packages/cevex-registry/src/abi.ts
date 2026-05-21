/**
 * CevexRegistry contract ABI.
 *
 * Extracted from contracts/CevexRegistry.sol.
 * Canonical Base and Base Sepolia addresses are set after deployment.
 */

export const CEVEX_REGISTRY_ABI = [
  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------
  {
    type: 'event',
    name: 'AgentRegistered',
    inputs: [
      { name: 'agentAddress',  type: 'address', indexed: true  },
      { name: 'scheme',        type: 'uint8',   indexed: false },
      { name: 'securityLevel', type: 'uint8',   indexed: false },
      { name: 'registeredAt',  type: 'uint64',  indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'KeyRotated',
    inputs: [
      { name: 'agentAddress', type: 'address', indexed: true  },
      { name: 'oldKeyHash',   type: 'bytes32', indexed: false },
      { name: 'newKeyHash',   type: 'bytes32', indexed: false },
      { name: 'rotatedAt',    type: 'uint64',  indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AgentRevoked',
    inputs: [
      { name: 'agentAddress', type: 'address', indexed: true  },
      { name: 'revokedAt',    type: 'uint64',  indexed: false },
    ],
  },

  // -------------------------------------------------------------------------
  // Write functions
  // -------------------------------------------------------------------------
  {
    type: 'function',
    name: 'registerAgent',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'publicKey',     type: 'bytes'   },
      { name: 'scheme',        type: 'uint8'   },
      { name: 'securityLevel', type: 'uint8'   },
      { name: 'metadataHash',  type: 'bytes32' },
    ],
    outputs: [
      { name: 'agentAddress', type: 'address' },
    ],
  },
  {
    type: 'function',
    name: 'rotateKey',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentAddress',      type: 'address' },
      { name: 'newPublicKey',      type: 'bytes'   },
      { name: 'rotationSignature', type: 'bytes'   },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'revokeAgent',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentAddress',        type: 'address' },
      { name: 'revocationSignature', type: 'bytes'   },
    ],
    outputs: [],
  },

  // -------------------------------------------------------------------------
  // View functions
  // -------------------------------------------------------------------------
  {
    type: 'function',
    name: 'getPublicKey',
    stateMutability: 'view',
    inputs: [
      { name: 'agentAddress', type: 'address' },
    ],
    outputs: [
      { name: 'publicKey', type: 'bytes'  },
      { name: 'scheme',    type: 'uint8'  },
    ],
  },
  {
    type: 'function',
    name: 'isActive',
    stateMutability: 'view',
    inputs: [
      { name: 'agentAddress', type: 'address' },
    ],
    outputs: [
      { name: '', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'getIdentity',
    stateMutability: 'view',
    inputs: [
      { name: 'agentAddress', type: 'address' },
    ],
    outputs: [
      { name: 'publicKey',     type: 'bytes'   },
      { name: 'scheme',        type: 'uint8'   },
      { name: 'securityLevel', type: 'uint8'   },
      { name: 'registeredAt',  type: 'uint64'  },
      { name: 'revokedAt',     type: 'uint64'  },
      { name: 'metadataHash',  type: 'bytes32' },
    ],
  },
] as const

// -------------------------------------------------------------------------
// Registry addresses
// -------------------------------------------------------------------------

export const REGISTRY_ADDRESSES: Record<string, `0x${string}` | null> = {
  'base':         null,         // Set after mainnet deployment
  'base-sepolia': null,         // Set after testnet deployment
}

// Scheme encoding used by the contract
export const SCHEME_ENCODING = {
  dilithium: 0,
  falcon:    1,
} as const

export const SECURITY_LEVEL_FOR_SCHEME = {
  dilithium2: 2,
  dilithium3: 3,
  dilithium5: 5,
  falcon512:  2,
  falcon1024: 5,
} as const
