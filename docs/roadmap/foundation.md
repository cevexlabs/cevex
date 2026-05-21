# Phase 1: Foundation

{% hint style="success" %}
**Implemented foundation.** The Dilithium identity path, deterministic addressing model, and Base registry source are in place.
{% endhint %}

The foundation phase establishes the core CEVEX identity primitive: entropy rooted in quantum physical processes, post-quantum signing, deterministic agent addressing, and an append-only registry model. These pieces define the security model that every later developer tool builds on.

---

## Core System

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003399', 'primaryTextColor': '#eff6ff', 'primaryBorderColor': '#1a7fff', 'lineColor': '#3d8bff', 'secondaryColor': '#001650', 'tertiaryColor': '#000d20', 'clusterBkg': '#001650', 'titleColor': '#eff6ff', 'edgeLabelBackground': '#001650'}}}%%
graph TD
    subgraph Entropy["Entropy"]
        QRNG["Hardware QRNG\nphotonic or vacuum source"]
        HEALTH["NIST SP 800-90B\ncontinuous health tests"]
        KDF["SHAKE-256\nconditioning and derivation"]
    end

    subgraph Signing["Signing"]
        DIL["CRYSTALS-Dilithium\nML-DSA"]
        FAL["FALCON\nreserved"]
    end

    subgraph Identity["Identity"]
        ADDR["agentAddress\nkeccak256(pk)[12..32]"]
        REG["CevexRegistry\nBase"]
        VERIFY["Trustless verification\nlocal lattice math"]
    end

    QRNG --> HEALTH --> KDF
    KDF --> DIL
    KDF -.-> FAL
    DIL --> ADDR
    FAL -.-> ADDR
    ADDR --> REG
    REG --> VERIFY

    style QRNG fill:#003399,color:#eff6ff,stroke:#1a7fff
    style HEALTH fill:#003399,color:#eff6ff,stroke:#1a7fff
    style KDF fill:#003399,color:#eff6ff,stroke:#1a7fff
    style DIL fill:#003399,color:#eff6ff,stroke:#1a7fff
    style FAL fill:#003399,color:#eff6ff,stroke:#1a7fff
    style ADDR fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style REG fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style VERIFY fill:#001650,color:#7dd3fc,stroke:#3d8bff
```

---

## Delivered Components

| Component | Specification | Status |
|---|---|---|
| Entropy source | Hardware QRNG interface with local development entropy | Implemented |
| Health testing | NIST SP 800-90B RCT and APT checks | Specified |
| Key derivation | SHAKE-256 conditioned seed derivation | Implemented |
| Primary signature | CRYSTALS-Dilithium, NIST FIPS 204 | Implemented |
| Secondary signature | FALCON, NIST FIPS 206 | Reserved interface |
| Agent address | `address(uint160(uint256(keccak256(publicKey))))` | Implemented |
| Registry contract | Immutable Base registry source | Source ready |
| Verification path | Public key lookup plus local signature verification | Implemented |

---

## Security Commitment

The foundation phase commits CEVEX to post-quantum unforgeability under the standard lattice assumptions used by the selected NIST schemes.

For the default Dilithium parameter set:

$$\text{EU-CMA} \leq_T \text{MSIS}_{n,q,k,l,\beta} \leq_T \text{Approx-SVP}$$

The CEVEX-3 target follows the Core-SVP estimate:

$$\lambda_Q \approx 0.265 \cdot \beta - 16.4 \approx 162 \text{ bits} \quad (\beta \approx 672)$$

Any published reduction below the 128-bit post-quantum threshold triggers migration planning for active parameter sets.

---

## Registry Record

```solidity
struct AgentIdentity {
    bytes publicKey;
    uint8 scheme;
    uint8 securityLevel;
    uint64 registeredAt;
    uint64 revokedAt;
    bytes32 metadataHash;
}
```

The registry is append-only. A registered identity can rotate keys or become permanently revoked, but its historical record remains available for audit and verification.

---

## Exit Criteria

| Requirement | Result |
|---|---|
| Deterministic address derivation from post-quantum public keys | Satisfied |
| Public key storage without certificate authorities | Satisfied |
| Signature verification without trusted intermediaries | Satisfied |
| Revocation state represented by registry contract source | Satisfied |
| Security horizon documented through 2080 | Satisfied |

---

## Next

* [Phase 2: Developer Access](developer-access.md)
* [Phase 3: Ecosystem Expansion](ecosystem-expansion.md)
* [Phase 4: Research Horizon](research-horizon.md)
