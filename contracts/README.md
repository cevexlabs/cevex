<div align="center">

# cevex-contracts

**Base smart contracts for the CEVEX on-chain identity registry**

![Solidity](https://img.shields.io/badge/solidity-0.8.24-003399?style=flat-square)
![Network](https://img.shields.io/badge/network-Base-0052FF?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-001650?style=flat-square)
![Status](https://img.shields.io/badge/status-deploy%20ready-1a7fff?style=flat-square)

</div>

---

## Overview

This directory contains the smart contract source and deployment tooling for the CEVEX on-chain identity registry on Base. The registry provides a decentralized, append-only record of provisioned agent identities, backed by Ethereum-secured finality.

---

## Contracts

| Contract | Deployment status | Description |
|----------|-------------------|-------------|
| `CevexRegistry` | Deploy ready | Singleton registry. Manages all agent identity records. |
| `ICevexRegistry` | Deploy ready | Interface for external integrators. |

---

## Contract Architecture

```
CevexRegistry (singleton)
    registerAgent(pk, scheme, securityLevel, metadataHash)
        stores AgentIdentity record in mapping
        emits AgentRegistered
    rotateKey(agentAddress, newPk, rotationSig)
        updates AgentIdentity record
        emits KeyRotated
    revokeAgent(agentAddress, revocationSig)
        sets revokedAt timestamp on AgentIdentity record
        emits AgentRevoked
    getPublicKey(agentAddress) view
    isActive(agentAddress) view

AgentIdentity (struct, stored per agent in registry mapping)
    publicKey: bytes
    scheme: uint8
    securityLevel: uint8
    registeredAt: uint64
    revokedAt: uint64
    metadataHash: bytes32
```

---

## Tooling

The contract workspace uses `solc` for compilation and `ethers` for Base Sepolia deployment scripts.

| File | Purpose |
|---|---|
| `CevexRegistry.sol` | Registry implementation |
| `interfaces/ICevexRegistry.sol` | External integration interface |
| `scripts/compile.mjs` | Compiles the registry and writes `build/CevexRegistry.json` |
| `scripts/deploy-base-sepolia.mjs` | Deploys the registry to Base Sepolia |
| `scripts/demo-base-sepolia.mjs` | Registers a live demo agent and verifies the on-chain record |

---

## Base Sepolia Live Demo

Create a local environment file:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Set `DEPLOYER_PRIVATE_KEY` to a funded Base Sepolia test wallet. Do not commit `.env`.

Install dependencies and compile:

```bash
npm install
npm run compile
```

Deploy the registry:

```bash
npm run deploy:base-sepolia
```

Run the live agent registration demo:

```bash
npm run demo:base-sepolia
```

Run the full path in one command:

```bash
npm run live:base-sepolia
```

The scripts write public deployment receipts to `deployments/base-sepolia.json` and `deployments/base-sepolia-demo.json`.

---

## Security

The registry contracts have been designed with the following security properties:

- Key rotation requires a valid signature under the currently registered key. An attacker without the secret key cannot rotate to a new key they control.
- Revocation requires a valid signature under the currently registered key. Third parties cannot revoke identities they do not control.
- The registry is append-only. Registered identities cannot be deleted, only revoked.
- No admin key, no upgradability, no proxy patterns that introduce upgrade risk. The registry is immutable once deployed.

To report a security issue, email security@cevex.io. Do not open a public issue.

---

## License

MIT. See [LICENSE](LICENSE).

---

<div align="center">
<sub>CEVEX Protocol. contact@cevex.io</sub>
</div>
