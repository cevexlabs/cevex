# Security Model

This document defines the threat model for CEVEX, the adversary classes the protocol is designed to resist, and the formal security properties that follow.

---

## Adversary Landscape

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003399', 'primaryTextColor': '#eff6ff', 'primaryBorderColor': '#1a7fff', 'lineColor': '#3d8bff', 'secondaryColor': '#001650', 'tertiaryColor': '#000d20', 'clusterBkg': '#001650', 'titleColor': '#eff6ff', 'edgeLabelBackground': '#001650'}}}%%
graph TD
    subgraph Classical["Classical Adversary"]
        C1["Polynomial-time classical compute"]
        C2["Breaks RSA, ECDSA via factoring/DLP"]
        C3["Cannot break Module LWE or NTRU"]
    end

    subgraph NISQ["NISQ Adversary"]
        N1["Hundreds to thousands of noisy qubits"]
        N2["Cannot run Shor's at relevant scale"]
        N3["No advantage over classical on lattices"]
    end

    subgraph FTQA["Fault-Tolerant Quantum Adversary"]
        F1["Large-scale error-corrected quantum computer"]
        F2["Runs Shor's: breaks RSA, ECDSA in poly time"]
        F3["Grover's: quadratic speedup on search"]
        F4["Cannot break Module LWE or NTRU"]
    end

    subgraph CEVEX["CEVEX Security"]
        X1["Layer 1: Physical entropy\nImmune to all compute-based attacks"]
        X2["Layer 2: Lattice signatures\nSecure against FTQA"]
        X3["Layer 3: On-chain registry\nSecure against registry adversary"]
    end

    Classical -->|DEFEATED BY| X2
    NISQ -->|DEFEATED BY| X2
    FTQA -->|DEFEATED BY| X1
    FTQA -->|DEFEATED BY| X2

    style C1 fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style C2 fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style C3 fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style N1 fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style N2 fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style N3 fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style F1 fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style F2 fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style F3 fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style F4 fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style X1 fill:#003399,color:#eff6ff,stroke:#1a7fff
    style X2 fill:#003399,color:#eff6ff,stroke:#1a7fff
    style X3 fill:#003399,color:#eff6ff,stroke:#1a7fff
```

---

## Security Parameters and the Quantum Horizon

CEVEX uses parameter sets calibrated to remain secure through the 2080 cryptographic horizon, based on NIST's published analysis of fault-tolerant quantum hardware timelines.

### Module LWE Hardness Estimate

The post-quantum security of Dilithium-3 against the best known lattice attacks (BKZ with quantum speedup):

$$\lambda_Q \approx 0.265 \cdot \beta - 16.4$$

For the CEVEX-3 parameter set, $\beta \approx 672$, giving $\lambda_Q \approx 162$ bits of post-quantum security.

### Security Level Summary

| CEVEX Level | Classical Security | Post-Quantum Security | 2080 Safe |
|-------------|--------------------|-----------------------|-----------|
| CEVEX-2 | 128 bits | 128 bits | Marginal |
| CEVEX-3 | 192 bits | 162 bits | Yes |
| CEVEX-5 | 256 bits | 256 bits | Yes (conservative) |

---

## Formal Security Definitions

### EU-CMA (Existential Unforgeability under Chosen-Message Attack)

No probabilistic polynomial-time adversary $\mathcal{A}$ can produce a valid forgery $(m^*, \sigma^*)$ where $m^*$ was not previously queried to the signing oracle:

$$\Pr[\text{Verify}(\text{pk}, m^*, \sigma^*) = 1 \ \land \ m^* \notin \mathcal{Q}] \leq \text{negl}(\lambda)$$

Both Dilithium and FALCON satisfy EU-CMA under their respective hardness assumptions.

---

## CEVEX vs Classical PKI

| Property | Classical PKI | CEVEX |
|----------|---------------|-------|
| Quantum resistance | None (Shor's breaks ECDSA) | Full (lattice hardness) |
| Trust model | Hierarchical CA chain | Trustless on-chain arithmetic |
| Entropy source | PRNG (deterministic) | QRNG (physically nondeterministic) |
| Revocation | OCSP (online query required) | On-chain (permissionless read) |
| Single point of failure | CA compromise | None by construction |
| Long-horizon security | Broken by FTQA | Secure through 2080 |

---

## See Also

- [Cryptographic Primitives](cryptographic-primitives.md)
- [Key Generation](key-generation.md)
- [Trustless Verification](verification.md)
