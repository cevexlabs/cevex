<div align="center">

# @cevex/sdk

**Official SDK for the CEVEX post-quantum identity protocol**

![npm](https://img.shields.io/npm/v/@cevex/sdk?style=flat-square&color=003399)
![PyPI](https://img.shields.io/pypi/v/cevex?style=flat-square&color=003399)
![License](https://img.shields.io/badge/license-MIT-001650?style=flat-square)
![Network](https://img.shields.io/badge/network-Base-0052FF?style=flat-square)
![PQC](https://img.shields.io/badge/PQC-NIST%20Selected-003399?style=flat-square)

</div>

---

## Overview

The CEVEX SDK provides everything you need to provision autonomous agents with post-quantum cryptographic identities, sign agent messages, and verify signatures on Base.

```typescript
import { CevexAgent, CevexVerifier } from '@cevex/sdk'

// Provision an agent
const agent = await CevexAgent.provision({
  entropySource: 'hardware-qrng',
  scheme: 'dilithium3',
  network: 'base'
})

// Sign a message
const signed = await agent.sign({ action: 'transfer', amount: '100' })

// Verify from any participant
const verifier = new CevexVerifier({ network: 'base' })
const valid = await verifier.verify(signed)
// true
```

---

## Packages

This SDK is organized as a monorepo. You can install individual packages or the combined bundle.

| Package | npm | Description |
|---------|-----|-------------|
| `@cevex/core` | [![npm](https://img.shields.io/npm/v/@cevex/core?style=flat-square&color=003399)](https://www.npmjs.com/package/@cevex/core) | Post-quantum primitives: Dilithium, FALCON, SHAKE-256 |
| `@cevex/agent` | [![npm](https://img.shields.io/npm/v/@cevex/agent?style=flat-square&color=003399)](https://www.npmjs.com/package/@cevex/agent) | Agent provisioning, signing, key rotation |
| `@cevex/verify` | [![npm](https://img.shields.io/npm/v/@cevex/verify?style=flat-square&color=003399)](https://www.npmjs.com/package/@cevex/verify) | Signature verification, batch verify, ZK transcripts |
| `@cevex/registry` | [![npm](https://img.shields.io/npm/v/@cevex/registry?style=flat-square&color=003399)](https://www.npmjs.com/package/@cevex/registry) | Base registry client, key resolution, revocation |
| `@cevex/sdk` | [![npm](https://img.shields.io/npm/v/@cevex/sdk?style=flat-square&color=003399)](https://www.npmjs.com/package/@cevex/sdk) | Combined bundle (all packages) |

Python: [`cevex`](https://pypi.org/project/cevex/) on PyPI.

---

## Installation

**TypeScript / JavaScript:**

```bash
npm install @cevex/sdk
# or individual packages
npm install @cevex/core @cevex/agent @cevex/verify @cevex/registry
```

**Python:**

```bash
pip install cevex
```

---

## Quick Start

### Provision an Agent (TypeScript)

```typescript
import { CevexAgent } from '@cevex/sdk'

const agent = await CevexAgent.provision({
  entropySource: 'hardware-qrng',    // or 'software' for testing only
  scheme: 'dilithium3',              // 'dilithium2' | 'dilithium3' | 'dilithium5' | 'falcon512' | 'falcon1024'
  network: 'base',                   // 'base' | 'base-sepolia'
  metadata: {
    agentType: 'transaction-signer',
    authorizedActions: ['transfer', 'approve']
  }
})

console.log('Agent address:', agent.address)
console.log('Registered on Base:', agent.txHash)
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

const verifier = new CevexVerifier({ network: 'base' })

const result = await verifier.verify(signed)
console.log('Valid:', result.valid)           // true
console.log('Agent active:', result.active)   // true
console.log('Scheme:', result.scheme)         // 'dilithium3'
```

### Batch Verification (TypeScript)

```typescript
const results = await verifier.verifyBatch([signed1, signed2, signed3, signed4])
// All verified in a single pass, ~3x faster than sequential
console.log('All valid:', results.every(r => r.valid))
```

### Provision an Agent (Python)

```python
from cevex import CevexAgent

agent = await CevexAgent.provision(
    entropy_source="hardware-qrng",
    scheme="dilithium3",
    network="base",
    metadata={
        "agent_type": "transaction-signer",
        "authorized_actions": ["transfer", "approve"]
    }
)

print(f"Agent address: {agent.address}")
print(f"Registered on Base: {agent.tx_hash}")
```

### Sign and Verify (Python)

```python
from cevex import CevexAgent, CevexVerifier

# Sign
signed = await agent.sign(action="transfer", amount="100")

# Verify
verifier = CevexVerifier(network="base")
result = await verifier.verify(signed)
print(f"Valid: {result.valid}")
```

---

## Key Rotation

```typescript
// Rotate to a fresh keypair
const rotated = await agent.rotateKey({
  entropySource: 'hardware-qrng',
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
  network: 'base',
  rpcUrl: 'https://mainnet.base.org',           // custom RPC
  registryAddress: '0x...',                      // custom registry (advanced)
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

Browser support is limited to signature verification. Agent provisioning and signing require a server-side environment with access to hardware QRNG.

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
