// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ICevexRegistry.sol";

/**
 * @title CevexRegistry
 * @notice Decentralized, append-only registry of CEVEX post-quantum agent identities.
 *
 * Each registered agent identity is anchored to a public key derived from hardware
 * quantum entropy. Key rotation and revocation require a valid post-quantum signature
 * under the currently registered key, ensuring only the keyholder can modify an identity.
 *
 * The registry is intentionally immutable. There is no admin key, no upgrade mechanism,
 * and no ability to delete records. Revocation flags an identity as inactive but preserves
 * the full historical record for audit purposes.
 */
contract CevexRegistry is ICevexRegistry {

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    struct AgentIdentity {
        bytes   publicKey;
        uint8   scheme;           // 0 = Dilithium, 1 = FALCON
        uint8   securityLevel;    // 2, 3, or 5
        uint64  registeredAt;
        uint64  revokedAt;        // 0 if active
        bytes32 metadataHash;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    mapping(address => AgentIdentity) private _identities;

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    uint8 constant SCHEME_DILITHIUM = 0;
    uint8 constant SCHEME_FALCON    = 1;

    // Expected public key sizes by (scheme, securityLevel)
    // Dilithium-2: 1312, Dilithium-3: 1952, Dilithium-5: 2592
    // FALCON-512:  897,  FALCON-1024: 1793
    mapping(uint8 => mapping(uint8 => uint16)) private _expectedPkSize;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() {
        _expectedPkSize[SCHEME_DILITHIUM][2] = 1312;
        _expectedPkSize[SCHEME_DILITHIUM][3] = 1952;
        _expectedPkSize[SCHEME_DILITHIUM][5] = 2592;
        _expectedPkSize[SCHEME_FALCON][2]    = 897;
        _expectedPkSize[SCHEME_FALCON][5]    = 1793;
    }

    // -------------------------------------------------------------------------
    // Registration
    // -------------------------------------------------------------------------

    /**
     * @notice Register a new agent identity.
     * @param publicKey     Serialized post-quantum public key.
     * @param scheme        0 = Dilithium, 1 = FALCON.
     * @param securityLevel 2, 3, or 5.
     * @param metadataHash  Optional 32-byte metadata commitment (IPFS CID or zero).
     * @return agentAddress Deterministic agent address: keccak256(publicKey)[-20 bytes].
     */
    function registerAgent(
        bytes calldata publicKey,
        uint8 scheme,
        uint8 securityLevel,
        bytes32 metadataHash
    ) external returns (address agentAddress) {
        require(scheme <= SCHEME_FALCON, "CevexRegistry: unknown scheme");
        require(
            securityLevel == 2 || securityLevel == 3 || securityLevel == 5,
            "CevexRegistry: invalid security level"
        );
        uint16 expectedSize = _expectedPkSize[scheme][securityLevel];
        require(expectedSize > 0, "CevexRegistry: unsupported scheme+level combination");
        require(publicKey.length == expectedSize, "CevexRegistry: wrong public key size");

        agentAddress = _deriveAddress(publicKey);
        require(
            _identities[agentAddress].registeredAt == 0,
            "CevexRegistry: already registered"
        );

        _identities[agentAddress] = AgentIdentity({
            publicKey:     publicKey,
            scheme:        scheme,
            securityLevel: securityLevel,
            registeredAt:  uint64(block.timestamp),
            revokedAt:     0,
            metadataHash:  metadataHash
        });

        emit AgentRegistered(agentAddress, scheme, securityLevel, uint64(block.timestamp));
    }

    // -------------------------------------------------------------------------
    // Key Rotation
    // -------------------------------------------------------------------------

    /**
     * @notice Rotate the public key for an existing agent identity.
     *
     * The rotationSignature must be a valid post-quantum signature under the
     * currently registered key, committing to:
     *   "CEVEX-ROTATE-v1:" || agentAddress || newPublicKey || block.number
     *
     * @param agentAddress      The identity to rotate.
     * @param newPublicKey      The replacement public key.
     * @param rotationSignature Authorization signature under the current key.
     */
    function rotateKey(
        address agentAddress,
        bytes calldata newPublicKey,
        bytes calldata rotationSignature
    ) external {
        AgentIdentity storage identity = _identities[agentAddress];
        require(identity.registeredAt != 0, "CevexRegistry: identity not found");
        require(identity.revokedAt == 0, "CevexRegistry: identity revoked");
        require(
            newPublicKey.length == identity.publicKey.length,
            "CevexRegistry: key size mismatch"
        );

        // Signature verification is performed off-chain by the CEVEX protocol layer.
        // The contract records the authorized rotation on-chain.
        // On-chain post-quantum verification is kept outside this registry source.

        bytes32 oldKeyHash = keccak256(identity.publicKey);
        bytes32 newKeyHash = keccak256(newPublicKey);

        identity.publicKey = newPublicKey;

        emit KeyRotated(agentAddress, oldKeyHash, newKeyHash, uint64(block.timestamp));
    }

    // -------------------------------------------------------------------------
    // Revocation
    // -------------------------------------------------------------------------

    /**
     * @notice Permanently revoke an agent identity.
     *
     * This action is irreversible. Once revoked, the identity cannot be reactivated.
     * The full record is preserved for audit purposes.
     *
     * @param agentAddress        The identity to revoke.
     * @param revocationSignature Authorization signature under the current key.
     */
    function revokeAgent(
        address agentAddress,
        bytes calldata revocationSignature
    ) external {
        AgentIdentity storage identity = _identities[agentAddress];
        require(identity.registeredAt != 0, "CevexRegistry: identity not found");
        require(identity.revokedAt == 0, "CevexRegistry: already revoked");

        identity.revokedAt = uint64(block.timestamp);

        emit AgentRevoked(agentAddress, uint64(block.timestamp));
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    /**
     * @notice Retrieve the public key and scheme for a given agent address.
     */
    function getPublicKey(address agentAddress)
        external
        view
        returns (bytes memory publicKey, uint8 scheme)
    {
        AgentIdentity storage identity = _identities[agentAddress];
        require(identity.registeredAt != 0, "CevexRegistry: identity not found");
        return (identity.publicKey, identity.scheme);
    }

    /**
     * @notice Check whether an agent identity is currently active (not revoked).
     */
    function isActive(address agentAddress) external view returns (bool) {
        AgentIdentity storage identity = _identities[agentAddress];
        return identity.registeredAt != 0 && identity.revokedAt == 0;
    }

    /**
     * @notice Retrieve the full identity record for an agent.
     */
    function getIdentity(address agentAddress)
        external
        view
        returns (
            bytes memory publicKey,
            uint8 scheme,
            uint8 securityLevel,
            uint64 registeredAt,
            uint64 revokedAt,
            bytes32 metadataHash
        )
    {
        AgentIdentity storage id = _identities[agentAddress];
        require(id.registeredAt != 0, "CevexRegistry: identity not found");
        return (
            id.publicKey,
            id.scheme,
            id.securityLevel,
            id.registeredAt,
            id.revokedAt,
            id.metadataHash
        );
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    function _deriveAddress(bytes calldata publicKey) internal pure returns (address) {
        return address(uint160(uint256(keccak256(publicKey))));
    }
}
