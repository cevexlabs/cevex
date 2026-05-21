# Examples

Annotated examples covering common CEVEX use cases.

{% hint style="info" %}
Full examples are being completed alongside the SDK release. See [Quickstart](quickstart.md) to get started today.
{% endhint %}

---

## Provision and Sign (TypeScript)

```typescript
import { CevexAgent, CevexVerifier } from '@cevex/sdk'

// Provision a new agent with hardware quantum entropy
const agent = await CevexAgent.provision({
  entropySource: 'hardware-qrng',
  scheme: 'dilithium3',
  network: 'base'
})

console.log('Agent address:', agent.address)

// Sign an action
const signed = await agent.sign({
  action: {
    type: 'transfer',
    to: '0xRecipientAddress',
    amount: '1000000',
    token: '0xTokenAddress'
  }
})

// Verify from any participant
const verifier = new CevexVerifier({ network: 'base' })
const result = await verifier.verify(signed)
console.log('Valid:', result.valid)
```

---

## Batch Verification (TypeScript)

```typescript
import { CevexVerifier } from '@cevex/sdk'

const verifier = new CevexVerifier({ network: 'base' })

// Verify multiple signatures in a single pass (~3x faster than sequential)
const results = await verifier.verifyBatch([signed1, signed2, signed3, signed4])

console.log('All valid:', results.allValid)
console.log('Verified:', results.verified)
console.log('Failed:', results.failed)
```

---

## Key Rotation (TypeScript)

```typescript
// Rotate to a fresh quantum-entropy keypair
// On-chain address remains the same
const { rotationTxHash } = await agent.rotateKey({
  entropySource: 'hardware-qrng',
  reason: 'scheduled-rotation'
})

console.log('Rotation confirmed:', rotationTxHash)
```

---

## Restore from Secret Key (TypeScript)

```typescript
import { CevexAgent } from '@cevex/sdk'
import { readFileSync } from 'fs'

// Load a stored secret key and restore the agent
const secretKey = readFileSync('./agent.key')

const agent = await CevexAgent.fromSecretKey(secretKey, 'dilithium3', {
  network: 'base'
})

console.log('Agent restored:', agent.address)
```

---

## Provision and Sign (Python)

```python
from cevex import CevexAgent, CevexVerifier

agent = await CevexAgent.provision(
    entropy_source="hardware-qrng",
    scheme="dilithium3",
    network="base"
)

signed = await agent.sign({
    "type": "transfer",
    "to": "0xRecipientAddress",
    "amount": "1000000"
})

verifier = CevexVerifier(network="base")
result = await verifier.verify(signed)
print(f"Valid: {result.valid}")
```

---

## See Also

- [Quickstart](quickstart.md)
- [API Reference](api-reference.md)
- [Configuration](configuration.md)
