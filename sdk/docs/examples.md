# Examples

Annotated examples covering common CEVEX use cases.

{% hint style="info" %}
Runnable local validation is available in `examples/run.mjs`. The examples below show the SDK integration shape for applications.
{% endhint %}

---

## Provision and Sign (TypeScript)

```typescript
import { CevexAgent, CevexVerifier } from '@cevex/sdk'

// Provision a new agent for local or testnet validation
const agent = await CevexAgent.provision({
  entropySource: 'software',
  scheme: 'dilithium3',
  network: 'base-sepolia'
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
const verifier = new CevexVerifier({ network: 'base-sepolia' })
const result = await verifier.verify(signed)
console.log('Valid:', result.valid)
```

---

## Batch Verification (TypeScript)

```typescript
import { CevexVerifier } from '@cevex/sdk'

const verifier = new CevexVerifier({ network: 'base-sepolia' })

// Verify multiple signatures through the shared batch result surface
const results = await verifier.verifyBatch([signed1, signed2, signed3, signed4])

console.log('All valid:', results.allValid)
console.log('Verified:', results.verified)
console.log('Failed:', results.failed)
```

---

## Key Rotation (TypeScript)

```typescript
// Rotate to a fresh keypair
// Registry identity remains the same when connected to a deployed registry
const { rotationTxHash } = await agent.rotateKey({
  entropySource: 'software',
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
  network: 'base-sepolia'
})

console.log('Agent restored:', agent.address)
```

---

## Provision and Sign (Python)

```python
from cevex import CevexAgent, CevexVerifier

agent = await CevexAgent.provision(
    entropy_source="software",
    scheme="dilithium3",
    network="base-sepolia"
)

signed = await agent.sign({
    "type": "transfer",
    "to": "0xRecipientAddress",
    "amount": "1000000"
})

verifier = CevexVerifier(network="base-sepolia")
result = await verifier.verify(signed)
print(f"Valid: {result.valid}")
```

---

## See Also

- [Quickstart](quickstart.md)
- [API Reference](api-reference.md)
- [Configuration](configuration.md)
