<div align="center">

# @cevex/sdk

**Official SDK for the CEVEX post-quantum identity protocol**

![TypeScript](https://img.shields.io/badge/typescript-source-003399?style=flat-square)
![Python](https://img.shields.io/badge/python-parity%20path-003399?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-001650?style=flat-square)
![Network](https://img.shields.io/badge/network-Base-0052FF?style=flat-square)
![PQC](https://img.shields.io/badge/PQC-NIST%20Selected-003399?style=flat-square)

</div>

---

## Overview

The CEVEX SDK provides the source packages for provisioning autonomous agents with post-quantum cryptographic identities, signing agent messages, and verifying signatures against the registry model.

```typescript
import { CevexAgent, CevexVerifier } from '@cevex/sdk'

// Provision an agent
const agent = await CevexAgent.provision({
  entropySource: 'software',
  scheme: 'dilithium3',
  network: 'base-sepolia'
})

// Sign a message
const signed = await agent.sign({ action: 'transfer', amount: '100' })

// Verify from any participant
const verifier = new CevexVerifier({ network: 'base-sepolia' })
const valid = await verifier.verify(signed)
// true
```

---

## Packages

This SDK is organized as a monorepo. Teams can use the combined bundle or the individual packages when integrating lower-level surfaces.

| Package | Description | Status |
|---------|-------------|--------|
| `@cevex/core` | Dilithium primitives, FALCON guarded interface, SHAKE-256 utilities | Implemented |
| `@cevex/agent` | Agent provisioning, signing, key rotation, revocation surface | Implemented |
| `@cevex/verify` | Signature verification, batch verification, transcript interface | Implemented |
| `@cevex/registry` | Base registry client, key resolution, write helpers | Source ready |
| `@cevex/sdk` | Combined bundle for application integrations | Active build |

Python source lives in `sdk/python` and follows the same API shape as the TypeScript packages.

---

## Installation

**TypeScript / JavaScript release package:**

```bash
npm install @cevex/sdk
# or individual packages
npm install @cevex/core @cevex/agent @cevex/verify @cevex/registry
```

**TypeScript source workspace:**

```bash
cd sdk
npm install
npm run build
```

**Python package:**

```bash
pip install cevex
```

---

## Quick Start

### Provision an Agent (TypeScript)

```typescript
import { CevexAgent } from '@cevex/sdk'

const agent = await CevexAgent.provision({
  entropySource: 'software',         // use 'hardware-qrng' in production
  scheme: 'dilithium3',              // 'dilithium2' | 'dilithium3' | 'dilithium5'
  network: 'base-sepolia',           // 'base' | 'base-sepolia'
  metadata: {
    agentType: 'transaction-signer',
    authorizedActions: ['transfer', 'approve']
  }
})

console.log('Agent address:', agent.address)
console.log('Registry transaction:', agent.txHash)
```

### Sign a Message (TypeScript)

```typescript
const signed = await agent.sign({
  action: 'transfer',
  to: '0xRecipientAddress',
  amount: '1000000',
  token: '0xTokenAddress'
})

console.log('Signature:', signed.signature)
console.log('Nonce:', signed.nonce)
```

### Verify a Signature (TypeScript)

```typescript
import { CevexVerifier } from '@cevex/sdk'

const verifier = new CevexVerifier({ network: 'base-sepolia' })

const result = await verifier.verify(signed)
console.log('Valid:', result.valid)           // true
console.log('Agent active:', result.active)   // true
console.log('Scheme:', result.scheme)         // 'dilithium3'
```

### Batch Verification (TypeScript)

```typescript
const results = await verifier.verifyBatch([signed1, signed2, signed3, signed4])
// All messages verified through the shared batch result surface
console.log('All valid:', results.every(r => r.valid))
```

### Provision an Agent (Python)

```python
from cevex import CevexAgent

agent = await CevexAgent.provision(
    entropy_source="software",
    scheme="dilithium3",
    network="base-sepolia",
    metadata={
        "agent_type": "transaction-signer",
        "authorized_actions": ["transfer", "approve"]
    }
)

print(f"Agent address: {agent.address}")
print(f"Registry transaction: {agent.tx_hash}")
```

### Sign and Verify (Python)

```python
from cevex import CevexAgent, CevexVerifier

# Sign
signed = await agent.sign(action="transfer", amount="100")

# Verify
verifier = CevexVerifier(network="base-sepolia")
result = await verifier.verify(signed)
print(f"Valid: {result.valid}")
```

---

## Key Rotation

```typescript
// Rotate to a fresh keypair
const rotated = await agent.rotateKey({
  entropySource: 'software',
  reason: 'scheduled-rotation'
})

console.log('New address:', rotated.address)     // same on-chain address
console.log('New tx:', rotated.rotationTxHash)   // rotation confirmed on Base
```

---

## Revocation

```typescript
// Revoke an agent identity permanently
await agent.revoke({ reason: 'decommissioned' })
```

---

## Configuration

```typescript
import { CevexConfig } from '@cevex/sdk'

const config: CevexConfig = {
  network: 'base-sepolia',
  rpcUrl: 'https://sepolia.base.org',           // custom RPC
  registryAddress: '0xRegistryAddress',          // canonical or custom registry
  cachePublicKeys: true,                         // cache resolved public keys locally
  cacheTtl: 3600,                                // seconds
  timeout: 10000,                                // ms per registry query
}
```

---

## Error Handling

```typescript
import { CevexError, ErrorCode } from '@cevex/sdk'

try {
  const result = await verifier.verify(signed)
} catch (err) {
  if (err instanceof CevexError) {
    switch (err.code) {
      case ErrorCode.IDENTITY_REVOKED:
        console.log('This agent has been revoked')
        break
      case ErrorCode.SIGNATURE_INVALID:
        console.log('Signature verification failed')
        break
      case ErrorCode.NONCE_REPLAY:
        console.log('Replayed message detected')
        break
    }
  }
}
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Quickstart](docs/quickstart.md) | Get an agent running in under 5 minutes |
| [API Reference](docs/api-reference.md) | Full TypeScript and Python API documentation |
| [Examples](docs/examples.md) | Annotated examples for common use cases |
| [Configuration](docs/configuration.md) | All configuration options |
| [Error Reference](docs/errors.md) | Complete error codes and handling guide |
| [Protocol Docs](https://github.com/cevexlabs/Cevex) | Underlying CEVEX protocol documentation |

---

## Supported Environments

| Environment | TypeScript | Python |
|-------------|-----------|--------|
| Node.js 18+ | Yes | N/A |
| Node.js 20+ | Yes | N/A |
| Browser (modern) | Yes (verify only) | N/A |
| Python 3.10+ | N/A | Yes |
| Python 3.11+ | N/A | Yes |
| Python 3.12+ | N/A | Yes |

Browser support is limited to signature verification. Production provisioning and signing require a server-side environment with access to an approved entropy source and secure key storage.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions require:

- Tests for any new functionality
- Type coverage for TypeScript packages
- No new dependencies without discussion in an issue first
- Security-sensitive changes require a review from the CEVEX security team

---

## License

MIT. See [LICENSE](LICENSE).

---

<div align="center">
<sub>CEVEX Protocol. contact@cevex.io</sub>
</div>
