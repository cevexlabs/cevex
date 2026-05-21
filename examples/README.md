# CEVEX Example Demo

This example is a local protocol validation run. It uses real ML-DSA-65 key generation, signing, and verification through `@noble/post-quantum`.

The demo does not call Base, does not write secrets to disk, and does not submit a transaction. It proves the signing flow locally before a registry or wallet is connected.

## What The Test Proves

1. A fresh post-quantum keypair is generated from conditioned entropy.
2. A realistic Base USDC transfer approval is encoded as canonical JSON.
3. The action is bound to `CEVEX-MSG-v1` with agent address, nonce, and timestamp.
4. The agent signs the exact bytes with ML-DSA-65.
5. A verifier checks the signature using only the public key and signed bytes.
6. The verifier rejects the same signature if the amount, recipient, or signature bytes are changed.

## Commands

```bash
npm test
```

Runs the realistic transfer approval test and emits JSON.

```bash
node run.mjs test
```

Runs the same test with the terminal display.

```bash
node run.mjs
```

Runs the full demo with the CLI reference panel.

```bash
node run.mjs help
```

Shows all available demo commands.

## Scenario

The test models a treasury agent approving a Base USDC transfer:

| Field | Example |
|---|---|
| Agent | `treasury-agent-01` |
| Role | `payment-approver` |
| Action | `erc20.transfer` |
| Network | `base` |
| Token | `USDC` |
| Amount | `1250.00` |
| Policy | `allowlist-transfer-v1` |

The negative tests rebuild the signed bytes with a larger amount or a different recipient. The original signature must fail against both modified messages.
