# Protocol Flow

The CEVEX authorization path is designed to make an agent action independently verifiable before execution.

## Execution Path

| Step | Action | Result |
|------|--------|--------|
| 1 | The operator or agent prepares an intent | Amount, receiver, policy, nonce, and agent context are fixed before signing |
| 2 | The agent signs the intent with ML-DSA | A post-quantum authorization artifact is produced |
| 3 | The verifier checks the registry anchor | The public key hash and agent record are resolved from Base |
| 4 | The verifier validates the signature locally | No certificate authority, oracle, or external trust anchor is required |
| 5 | The transaction becomes executable | Execution is allowed only when the signed intent and transaction values match |
| 6 | The network record is available for review | The registry record and transaction hash can be checked through the Base explorer |

## What This Shows

CEVEX binds a transaction intent to a post-quantum signature, checks the public key through the on-chain registry, verifies the authorization locally, and only then allows execution.

For normal users, this means a simple rule:

> If the signed intent, registry identity, and transaction values do not match, the action does not execute.

For developers, the same path maps directly to the SDK and CLI surfaces:

```text
prepare intent
authorize with ML-DSA
resolve registry agent
verify signature and values
execute transaction
open explorer record
```

## Why It Matters

Classical wallet signatures prove control over a classical key. CEVEX extends the identity layer by adding a post-quantum authorization artifact and a Base registry anchor. This makes the agent identity portable, independently verifiable, and suitable for automated systems that need clear execution rules.
