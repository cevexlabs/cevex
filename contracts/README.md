<div align="center">

# cevex-contracts

**Base smart contracts for the CEVEX on-chain identity registry**

![Solidity](https://img.shields.io/badge/solidity-0.8.24-003399?style=flat-square)
![Network](https://img.shields.io/badge/network-Base-0052FF?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-001650?style=flat-square)
![Tests](https://img.shields.io/badge/tests-passing-1a7fff?style=flat-square)

</div>

---

## Overview

This repository contains the smart contracts powering the CEVEX on-chain identity registry on Base. The registry provides a decentralized, append-only record of all provisioned CEVEX agent identities, backed by Ethereum-secured finality.

---

## Contracts

| Contract | Address (Base Mainnet) | Description |
|----------|----------------------|-------------|
| `CevexRegistry` | `0x...` | Singleton registry. Manages all agent identity records. |
| `ICevexRegistry` | N/A | Interface for external integrators. |

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

## Installation

```bash
npm install
```

Requires Node.js 18+ and Hardhat.

---

## Testing

```bash
npm test
```

```bash
npm run test:coverage
```

---

## Deployment

**Base Sepolia (testnet):**

```bash
npx hardhat deploy --network base-sepolia
```

**Base Mainnet:**

```bash
npx hardhat deploy --network base
```

Deployment addresses are recorded in `deployments/`.

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
