# CEVEX Protocol Trace

This reference flow uses real ML-DSA-65 key generation, signing, and verification through `@noble/post-quantum`.

It does not call Base, does not write secrets to disk, and does not submit a transaction. It traces the authorization flow before registry-backed network execution.

## What The Check Confirms

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

Runs the transfer approval check and emits JSON.

```bash
node run.mjs test
```

Runs the same check with the terminal display.

```bash
node run.mjs
```

Runs the full authorization trace with the CLI reference panel.

```bash
node run.mjs help
```

Shows all available reference commands.

## File Workflow

For a more realistic command-by-command flow, use `workflow.mjs`.

```bash
node workflow.mjs init
```

Creates:

| File | Purpose |
|---|---|
| `artifacts/agent.key.json` | Local authorization key for the agent |
| `artifacts/registry-record.json` | Offline registry record with the public key |
| `artifacts/transfer-request.json` | Editable Base USDC transfer request |

```bash
node workflow.mjs request --amount 2500.00 --recipient 0x6fB3E0A217407EFFf7Ca062D46c26E5d60a14d69
```

Writes a transfer request with values you provide. Useful options are:

| Option | Purpose |
|---|---|
| `--amount` | Transfer amount |
| `--recipient` | Destination address |
| `--agent` | Agent ID |
| `--role` | Agent role |
| `--policy` | Policy ID |
| `--limit` | Policy amount limit |

```bash
node workflow.mjs sign
```

Reads the authorization key and transfer request, then writes `artifacts/signed-transfer.json`.

```bash
node workflow.mjs verify
```

Reads the registry record and signed transfer, then checks the signature.

```bash
node workflow.mjs tamper
```

Creates `artifacts/tampered-transfer.json` by changing the amount and recipient. Verification must reject it.

You can also run the full sequence:

```bash
npm run workflow
```

## Scenario

The flow models a treasury agent approving a Base USDC transfer:

| Field | Example |
|---|---|
| Agent | `treasury-agent-01` |
| Role | `payment-approver` |
| Action | `erc20.transfer` |
| Network | `base` |
| Token | `USDC` |
| Amount | `1250.00` |
| Policy | `allowlist-transfer-v1` |

The integrity checks rebuild the signed bytes with a larger amount or a different recipient. The original signature must fail against both modified messages.
