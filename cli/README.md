<div align="center">

# cevex-cli

**Command-line interface for CEVEX agent provisioning and key management**

![npm](https://img.shields.io/npm/v/@cevex/cli?style=flat-square&color=003399)
![License](https://img.shields.io/badge/license-MIT-001650?style=flat-square)
![Network](https://img.shields.io/badge/network-Base-0052FF?style=flat-square)

</div>

---

## Installation

```bash
npm install -g @cevex/cli
```

Verify:

```bash
cevex --version
```

---

## Commands

### `cevex provision`

Provision a new agent identity on Base.

```bash
cevex provision \
  --entropy hardware-qrng \
  --scheme dilithium3 \
  --network base \
  --out ./agent.key
```

Options:

| Flag | Default | Description |
|------|---------|-------------|
| `--entropy` | `hardware-qrng` | Entropy source. `hardware-qrng` or `software` (dev only). |
| `--scheme` | `dilithium3` | Signature scheme. |
| `--network` | `base` | Target network. `base` or `base-sepolia`. |
| `--out` | `./agent.key` | Output path for encrypted secret key file. |
| `--metadata` | none | Path to JSON metadata file to anchor on-chain. |
| `--rpc` | public Base RPC | Custom RPC URL. |

Output:

```
Provisioning agent on Base...
Sampling quantum entropy...   done
Deriving keypair (dilithium3)... done
Registering on Base...        done

Agent address:  0x1a2b3c4d...
Tx hash:        0xabc123...
Key saved to:   ./agent.key (encrypted)

Agent is live. Verify with:
  cevex info 0x1a2b3c4d...
```

---

### `cevex sign`

Sign a message with an existing agent.

```bash
cevex sign \
  --key ./agent.key \
  --message '{"action":"transfer","amount":"100"}' \
  --out ./signed.json
```

Options:

| Flag | Default | Description |
|------|---------|-------------|
| `--key` | required | Path to encrypted agent key file. |
| `--message` | required | JSON string or path to JSON file. |
| `--out` | stdout | Output path for signed message JSON. |

---

### `cevex verify`

Verify a signed message.

```bash
cevex verify --message ./signed.json --network base
```

Output:

```
Verifying signature...
  Agent:    0x1a2b3c4d...
  Scheme:   dilithium3
  Active:   yes
  Valid:    YES
```

---

### `cevex rotate`

Rotate an agent's keypair.

```bash
cevex rotate \
  --key ./agent.key \
  --entropy hardware-qrng \
  --out ./agent-rotated.key
```

---

### `cevex revoke`

Permanently revoke an agent identity.

```bash
cevex revoke --key ./agent.key --reason "decommissioned"
```

Output:

```
Revoking agent identity 0x1a2b3c4d...
This action is permanent and cannot be undone.
Confirm? [y/N]: y

Revocation submitted.
Tx hash: 0xdef456...
Agent 0x1a2b3c4d... is now revoked on Base.
```

---

### `cevex info`

Look up an agent identity on-chain.

```bash
cevex info 0x1a2b3c4d...
```

Output:

```
Agent: 0x1a2b3c4d...

  Scheme:         dilithium3
  Security level: 3
  Status:         ACTIVE
  Registered:     2025-01-01 00:00:00 UTC (block 1234567)
  Metadata:       ipfs://Qm...
```

---

### `cevex batch-verify`

Batch verify a list of signed messages.

```bash
cevex batch-verify --messages ./messages.json --network base
```

Output:

```
Batch verifying 128 messages...
  Valid:   127
  Invalid: 1
  Failed:  message[43] (NONCE_REPLAY)
```

---

## Key File Format

The `--out` flag saves an encrypted key file. The file is encrypted with a passphrase prompted at runtime and never stored in plaintext.

```json
{
  "cevexKeyFile": "1",
  "agentAddress": "0x1a2b3c4d...",
  "scheme": "dilithium3",
  "network": "base",
  "encryptedKey": "...",
  "kdf": "scrypt",
  "salt": "...",
  "iv": "..."
}
```

---

## Configuration File

Create `~/.cevex/config.json` to set defaults:

```json
{
  "network": "base",
  "entropy": "hardware-qrng",
  "scheme": "dilithium3",
  "rpcUrl": "https://mainnet.base.org"
}
```

---

## License

MIT. See [LICENSE](LICENSE).

---

<div align="center">
<sub>CEVEX Protocol. contact@cevex.io</sub>
</div>
