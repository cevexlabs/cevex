<div align="center">

# cevex-cli

**Command-line interface for CEVEX agent provisioning and key management**

![CLI](https://img.shields.io/badge/cli-source-003399?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-001650?style=flat-square)
![Network](https://img.shields.io/badge/network-Base-0052FF?style=flat-square)

</div>

---

## Installation

**Release package:**

```bash
npm install -g @cevex/cli
```

**Source package:**

Source builds expect the local SDK packages to be linked in the release workspace.

```bash
cd cli
npm run build
```

Verify:

```bash
cevex --version
```

---

## Commands

### `cevex provision`

Provision a new agent identity locally, or register it on Base when a deployer key and registry address are configured.

```bash
cevex provision \
  --entropy software \
  --scheme dilithium3 \
  --network base-sepolia \
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
| `--deployer-key` | env `CEVEX_DEPLOYER_KEY` | Wallet private key for registry writes. |
| `--registry` | canonical address | Override registry contract address. |

Output:

```
Provisioning agent on Base...
  Network:  base-sepolia
  Scheme:   dilithium3
  Entropy:  software

Sampling entropy...          done

Agent address:  0x1a2b3c4d...
Key saved to:   ./agent.key (encrypted)

Agent provisioned locally. Run with --deployer-key to register on Base.
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
