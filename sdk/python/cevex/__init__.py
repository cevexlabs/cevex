"""
cevex - Official Python SDK for the CEVEX post-quantum identity protocol

Provision autonomous agents with post-quantum cryptographic identities,
sign agent messages, and verify signatures on Base.

Basic usage:

    from cevex import CevexAgent, CevexVerifier

    # Provision a new agent
    agent = await CevexAgent.provision(
        entropy_source="hardware-qrng",
        scheme="dilithium3",
        network="base"
    )

    # Sign a message
    signed = await agent.sign({"action": "transfer", "amount": "100"})

    # Verify from any participant
    verifier = CevexVerifier(network="base")
    result = await verifier.verify(signed)
    assert result.valid
"""

from .agent import CevexAgent
from .verifier import CevexVerifier
from .types import (
    SignatureScheme,
    SignedMessage,
    VerificationResult,
    BatchVerificationResult,
    CevexError,
    ErrorCode,
)
from .registry import RegistryClient

__version__ = "0.1.0"
__all__ = [
    "CevexAgent",
    "CevexVerifier",
    "RegistryClient",
    "SignatureScheme",
    "SignedMessage",
    "VerificationResult",
    "BatchVerificationResult",
    "CevexError",
    "ErrorCode",
]
