// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ICevexRegistry
 * @notice Interface for the CEVEX on-chain identity registry.
 *
 * Use this interface to integrate with the CEVEX registry from other contracts.
 */
interface ICevexRegistry {

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event AgentRegistered(
        address indexed agentAddress,
        uint8 scheme,
        uint8 securityLevel,
        uint64 registeredAt
    );

    event KeyRotated(
        address indexed agentAddress,
        bytes32 oldKeyHash,
        bytes32 newKeyHash,
        uint64 rotatedAt
    );

    event AgentRevoked(
        address indexed agentAddress,
        uint64 revokedAt
    );

    // -------------------------------------------------------------------------
    // Functions
    // -------------------------------------------------------------------------

    function registerAgent(
        bytes calldata publicKey,
        uint8 scheme,
        uint8 securityLevel,
        bytes32 metadataHash
    ) external returns (address agentAddress);

    function rotateKey(
        address agentAddress,
        bytes calldata newPublicKey,
        bytes calldata rotationSignature
    ) external;

    function revokeAgent(
        address agentAddress,
        bytes calldata revocationSignature
    ) external;

    function getPublicKey(address agentAddress)
        external
        view
        returns (bytes memory publicKey, uint8 scheme);

    function isActive(address agentAddress) external view returns (bool);

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
        );
}
