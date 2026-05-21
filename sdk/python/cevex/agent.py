"""
CevexAgent: provision and operate a CEVEX agent identity.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

from .types import SignatureScheme, SignedMessage, Signature
from .entropy import sample_entropy
from .keygen import derive_keypair
from .address import derive_address
from .registry import RegistryClient
from .signing import dilithium_sign, falcon_sign
from .message import encode_action, build_signed_bytes


@dataclass
class ProvisionResult:
    agent: "CevexAgent"
    tx_hash: str
    address: str


class CevexAgent:
    """
    A provisioned CEVEX agent capable of signing messages.

    Do not instantiate directly. Use CevexAgent.provision() or
    CevexAgent.from_secret_key() instead.

    Example:
        agent = await CevexAgent.provision(
            entropy_source="hardware-qrng",
            scheme="dilithium3",
            network="base"
        )
        signed = await agent.sign({"action": "transfer", "amount": "100"})
    """

    def __init__(
        self,
        address: str,
        public_key: bytes,
        secret_key: bytes,
        scheme: SignatureScheme,
        registry: RegistryClient,
        network: str,
        nonce: int = 0,
    ) -> None:
        self.address = address
        self.scheme = scheme
        self.network = network
        self._public_key = public_key
        self._secret_key = secret_key
        self._registry = registry
        self._nonce = nonce

    @classmethod
    async def provision(
        cls,
        entropy_source: str = "hardware-qrng",
        scheme: SignatureScheme = "dilithium3",
        network: str = "base",
        metadata: dict[str, Any] | None = None,
        rpc_url: str | None = None,
    ) -> "CevexAgent":
        """
        Provision a new agent identity.

        Generates a quantum-entropy keypair and registers it on Base.

        Args:
            entropy_source: 'hardware-qrng' for production, 'software' for testing only.
            scheme: Signature scheme. Default: 'dilithium3'.
            network: Target network. 'base' or 'base-sepolia'.
            metadata: Optional metadata to anchor on-chain.
            rpc_url: Custom RPC URL. If not set, uses the public Base RPC.

        Returns:
            A provisioned CevexAgent instance.
        """
        # 1. Sample entropy and derive keypair
        entropy = await sample_entropy(entropy_source)
        public_key, secret_key = await derive_keypair(entropy, scheme)

        # 2. Derive on-chain address
        address = derive_address(public_key)

        # 3. Register on Base
        registry = RegistryClient(network=network, rpc_url=rpc_url)
        metadata_hash = (
            await registry.upload_metadata(metadata) if metadata else bytes(32)
        )

        tx_hash = await registry.register_agent(
            public_key=public_key,
            scheme=scheme,
            metadata_hash=metadata_hash,
        )

        return cls(
            address=address,
            public_key=public_key,
            secret_key=secret_key,
            scheme=scheme,
            registry=registry,
            network=network,
        )

    @classmethod
    async def from_secret_key(
        cls,
        secret_key: bytes,
        scheme: SignatureScheme,
        network: str = "base",
        rpc_url: str | None = None,
    ) -> "CevexAgent":
        """
        Restore an agent from a stored secret key.

        Use this to reload an agent after a restart without reprovisioning.
        """
        from .keygen import recover_public_key

        public_key = await recover_public_key(secret_key, scheme)
        address = derive_address(public_key)
        registry = RegistryClient(network=network, rpc_url=rpc_url)

        last_nonce = await registry.get_last_nonce(address)

        return cls(
            address=address,
            public_key=public_key,
            secret_key=secret_key,
            scheme=scheme,
            registry=registry,
            network=network,
            nonce=last_nonce,
        )

    async def sign(self, action: dict[str, Any] | str | bytes) -> SignedMessage:
        """
        Sign a message as this agent.

        Args:
            action: The action payload. Dict, string, or raw bytes.

        Returns:
            A SignedMessage ready for broadcast and verification.
        """
        encoded_action = encode_action(action)
        self._nonce += 1
        timestamp = int(time.time() * 1000)

        signed_bytes = build_signed_bytes(
            version=1,
            agent_address=self.address,
            nonce=self._nonce,
            timestamp=timestamp,
            action=encoded_action,
        )

        sign_fn = dilithium_sign if self.scheme.startswith("dilithium") else falcon_sign
        sig_bytes = await sign_fn(self._secret_key, signed_bytes)

        return SignedMessage(
            version=1,
            agent_address=self.address,
            nonce=self._nonce,
            timestamp=timestamp,
            action=encoded_action,
            signature=Signature(bytes=sig_bytes, scheme=self.scheme),
        )

    async def rotate_key(
        self,
        entropy_source: str = "hardware-qrng",
        reason: str = "",
    ) -> dict[str, str]:
        """
        Rotate this agent's keypair.

        Derives a fresh keypair from new quantum entropy and submits a rotation
        transaction to the Base registry. The agent's on-chain address is unchanged.

        Returns:
            Dict with 'rotation_tx_hash'.
        """
        entropy = await sample_entropy(entropy_source)
        new_public_key, new_secret_key = await derive_keypair(entropy, self.scheme)

        self._nonce += 1
        rotation_payload = (
            f"CEVEX-ROTATE-v1:{new_public_key.hex()}"
        ).encode()

        signed_bytes = build_signed_bytes(
            version=1,
            agent_address=self.address,
            nonce=self._nonce,
            timestamp=int(time.time() * 1000),
            action=rotation_payload,
        )

        rotation_sig = await dilithium_sign(self._secret_key, signed_bytes)

        tx_hash = await self._registry.rotate_key(
            agent_address=self.address,
            new_public_key=new_public_key,
            rotation_signature=rotation_sig,
        )

        self._public_key = new_public_key
        self._secret_key = new_secret_key

        return {"rotation_tx_hash": tx_hash}

    async def revoke(self, reason: str = "") -> dict[str, str]:
        """
        Permanently revoke this agent identity.

        This action is irreversible. Future signatures from this identity will be
        rejected by all verifiers.

        Returns:
            Dict with 'tx_hash'.
        """
        self._nonce += 1
        revoke_payload = f"CEVEX-REVOKE-v1:{reason}".encode()

        signed_bytes = build_signed_bytes(
            version=1,
            agent_address=self.address,
            nonce=self._nonce,
            timestamp=int(time.time() * 1000),
            action=revoke_payload,
        )

        revoke_sig = await dilithium_sign(self._secret_key, signed_bytes)

        tx_hash = await self._registry.revoke_agent(
            agent_address=self.address,
            revocation_signature=revoke_sig,
        )

        return {"tx_hash": tx_hash}
