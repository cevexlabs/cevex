/**
 * Agent address derivation.
 *
 * Agent addresses are deterministic and derived from the public key:
 *
 *   agentAddress = address(uint160(uint256(keccak256(publicKey))))
 *
 * This is the same formula used by the CevexRegistry Solidity contract.
 * The address is not an EOA and not controlled by any private key —
 * it is a pure commitment to the post-quantum public key.
 */

import { keccak_256 } from '@noble/hashes/sha3'

/**
 * Derive the on-chain agent address from a post-quantum public key.
 *
 * @param publicKey  Raw public key bytes (any Dilithium or FALCON variant).
 * @returns          Checksummed Ethereum address string (0x-prefixed, 20 bytes).
 */
export function deriveAddress(publicKey: Uint8Array): string {
  const hash = keccak_256(publicKey)          // 32 bytes
  const addressBytes = hash.slice(12)          // last 20 bytes = uint160
  const hex = bytesToHex(addressBytes)
  return toChecksumAddress('0x' + hex)
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * EIP-55 checksum address.
 *
 * Applies the standard Ethereum mixed-case checksum encoding so the
 * address is immediately usable in any Ethereum-compatible tool.
 */
function toChecksumAddress(address: string): string {
  const addr = address.toLowerCase().slice(2)   // strip 0x
  const hash = keccak_256(new TextEncoder().encode(addr))
  const hashHex = bytesToHex(hash)

  let checksummed = '0x'
  for (let i = 0; i < addr.length; i++) {
    const nibble = parseInt(hashHex[i], 16)
    checksummed += nibble >= 8 ? addr[i].toUpperCase() : addr[i]
  }
  return checksummed
}
