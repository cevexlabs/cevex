# Quickstart

Get a CEVEX agent running for local validation or testnet integration in under 5 minutes.

---

## Prerequisites

- Node.js 18+ or Python 3.10+
- `software` entropy for development, or hardware QRNG access for production
- A funded wallet when submitting registry writes to Base or Base Sepolia

---

## TypeScript

### Install

```bash
npm install @cevex/sdk
```

### Provision your first agent

```typescript
import { CevexAgent } from '@cevex/sdk'

async function main() {
  console.log('Provisioning agent...')

  const agent = await CevexAgent.provision({
    entropySource: 'software',   // use 'hardware-qrng' in production
    scheme: 'dilithium3',
    network: 'base-sepolia',     // use 'base' for mainnet
  })

  console.log('Agent address:', agent.address)
  console.log('Scheme:', agent.scheme)
  console.log('Network:', agent.network)
}

main()
```

### Sign a message

```typescript
const signed = await agent.sign({
  action: {
    type: 'transfer',
    to: '0xRecipientAddress',
    amount: '1000000',
  }
})

console.log('Nonce:', signed.nonce)
console.log('Timestamp:', signed.timestamp)
console.log('Signature length:', signed.signature.bytes.length, 'bytes')
```

### Verify a signature

```typescript
import { CevexVerifier } from '@cevex/sdk'

const verifier = new CevexVerifier({ network: 'base-sepolia' })
const result = await verifier.verify(signed)

console.log('Valid:', result.valid)          // true
console.log('Active:', result.active)        // true
console.log('Scheme:', result.scheme)        // 'dilithium3'
```

### Serialize and transmit

```typescript
import { serializeSignedMessage, deserializeSignedMessage } from '@cevex/sdk'

// Serialize to bytes for transmission
const bytes = serializeSignedMessage(signed)

// Deserialize on the receiving end
const received = deserializeSignedMessage(bytes)

// Verify the received message
const result = await verifier.verify(received)
```

---

## Python

### Install

```bash
pip install cevex
```

### Provision your first agent

```python
import asyncio
from cevex import CevexAgent

async def main():
    print("Provisioning agent...")

    agent = await CevexAgent.provision(
        entropy_source="software",   # use "hardware-qrng" in production
        scheme="dilithium3",
        network="base-sepolia",      # use "base" for mainnet
    )

    print(f"Agent address: {agent.address}")
    print(f"Scheme: {agent.scheme}")
    print(f"Network: {agent.network}")

asyncio.run(main())
```

### Sign and verify

```python
from cevex import CevexAgent, CevexVerifier

async def main():
    agent = await CevexAgent.provision(
        entropy_source="software",
        scheme="dilithium3",
        network="base-sepolia",
    )

    # Sign a message
    signed = await agent.sign({
        "action": "transfer",
        "to": "0xRecipientAddress",
        "amount": "1000000",
    })

    print(f"Nonce: {signed.nonce}")
    print(f"Signature: {len(signed.signature.bytes)} bytes")

    # Verify from any participant
    verifier = CevexVerifier(network="base-sepolia")
    result = await verifier.verify(signed)

    print(f"Valid: {result.valid}")
    print(f"Active: {result.active}")
```

---

## Moving to Production

When the application moves from local validation to a production registry path:

1. Change `network: 'base-sepolia'` to `network: 'base'`
2. Replace `entropySource: 'software'` with `entropySource: 'hardware-qrng'`
3. Set the canonical registry address for the deployment environment
4. Ensure the deployment environment has an approved hardware entropy source
5. Store the agent secret key inside an HSM, TEE, or equivalent secure boundary

---

## Next Steps

- [API Reference](api-reference.md): Full API documentation for all packages
- [Examples](examples.md): Batch verification, key rotation, ZK transcripts, and more
- [Configuration](configuration.md): Custom RPC URLs, caching, timeouts
- [Protocol Docs](https://github.com/cevexlabs/Cevex): Understand the underlying cryptography
