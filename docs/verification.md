# Trustless Verification

CEVEX signatures can be verified by any participant in the network using only public information. No certificate authority, trust anchor, online service, or trusted third party is required at any point in the verification path.

---

## Verification Architecture

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003399', 'primaryTextColor': '#eff6ff', 'primaryBorderColor': '#1a7fff', 'lineColor': '#3d8bff', 'secondaryColor': '#001650', 'tertiaryColor': '#000d20', 'clusterBkg': '#001650', 'titleColor': '#eff6ff', 'edgeLabelBackground': '#001650'}}}%%
graph TD
    subgraph Input["Input"]
        M["Message m"]
        S["Signature sigma\n(c, z, hints)"]
        A["Agent Address"]
    end

    subgraph Resolve["Key Resolution"]
        CACHE{"Local cache\nhit?"}
        REG["Base Registry\ngetPublicKey(agentAddress)"]
        PK["Public Key pk\n(rho, t1)"]
    end

    subgraph Verify["Lattice Verification"]
        ACTIVE["Check: isActive(agentAddress)"]
        NONCE["Check: nonce > lastSeen"]
        MATH["Recompute w' = Az - c*t1*2^d"]
        HASH["Check: H(tr || m || w1') == c"]
        NORM["Check: norm(z) < gamma_1 - beta"]
    end

    subgraph Result["Result"]
        VALID["VALID"]
        INVALID["INVALID"]
    end

    M --> ACTIVE
    S --> MATH
    A --> CACHE
    CACHE -->|Miss| REG
    CACHE -->|Hit| PK
    REG --> PK
    PK --> MATH
    ACTIVE --> NONCE
    NONCE --> MATH
    MATH --> HASH
    HASH --> NORM
    NORM -->|All pass| VALID
    NORM -->|Any fail| INVALID

    style M fill:#003399,color:#eff6ff,stroke:#1a7fff
    style S fill:#003399,color:#eff6ff,stroke:#1a7fff
    style A fill:#003399,color:#eff6ff,stroke:#1a7fff
    style CACHE fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style REG fill:#003399,color:#eff6ff,stroke:#1a7fff
    style PK fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style ACTIVE fill:#003399,color:#eff6ff,stroke:#1a7fff
    style NONCE fill:#003399,color:#eff6ff,stroke:#1a7fff
    style MATH fill:#003399,color:#eff6ff,stroke:#1a7fff
    style HASH fill:#003399,color:#eff6ff,stroke:#1a7fff
    style NORM fill:#003399,color:#eff6ff,stroke:#1a7fff
    style VALID fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style INVALID fill:#001650,color:#7dd3fc,stroke:#3d8bff
```

---

## Public Key Resolution

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003399', 'primaryTextColor': '#eff6ff', 'primaryBorderColor': '#1a7fff', 'lineColor': '#3d8bff', 'secondaryColor': '#001650', 'tertiaryColor': '#000d20', 'actorBkg': '#003399', 'actorBorder': '#1a7fff', 'actorTextColor': '#eff6ff', 'actorLineColor': '#3d8bff', 'signalColor': '#7dd3fc', 'signalTextColor': '#eff6ff', 'labelBoxBkgColor': '#001650', 'labelBoxBorderColor': '#1a7fff', 'labelTextColor': '#eff6ff', 'noteBorderColor': '#1a7fff', 'noteBkgColor': '#001650', 'noteTextColor': '#eff6ff', 'activationBorderColor': '#1a7fff', 'activationBkgColor': '#003399'}}}%%
sequenceDiagram
    participant V as Verifier
    participant C as Local Cache
    participant B as Base Registry

    V->>C: Check cache for agentAddress
    alt Cache hit (within TTL)
        C-->>V: Return cached pk
    else Cache miss
        V->>B: getPublicKey(agentAddress)
        B-->>V: pk, scheme
        V->>C: Store pk in cache (TTL: 3600s)
    end
    V->>V: Run lattice verification
    V-->>V: VALID or INVALID
```

In steady-state operation, verification requires zero network round trips. The verifier holds cached public keys, receives the message and signature, and performs local lattice arithmetic.

---

## Batch Verification

For scenarios where a verifier must check many signatures at once, CEVEX supports batch verification using a randomized linear combination:

$$\sum_{i=1}^{n} r_i \cdot \text{VerifyEq}_i = 0$$

where $r_i$ are freshly sampled random coefficients. If all $n$ signatures are valid, the sum is zero with overwhelming probability.

| Batch Size | Sequential (ms) | Batch (ms) | Speedup |
|------------|-----------------|------------|---------|
| 8 | 0.80 | 0.52 | 1.5x |
| 64 | 6.40 | 3.10 | 2.1x |
| 512 | 51.2 | 18.4 | 2.8x |
| 4096 | 409.6 | 112.0 | 3.7x |

---

## Security Properties

| Property | Description |
|----------|-------------|
| Completeness | A valid signature always passes verification |
| Soundness | An invalid signature passes with probability at most $2^{-\lambda}$ |
| Zero-knowledge | Verification reveals nothing about the signer's secret key |
| Non-malleability | A valid signature cannot be modified into another valid signature |
| Trustlessness | No trusted third party required at any step |
| Scale independence | Throughput does not degrade as registered agents grow |

---

## See Also

- [Post-Quantum Signatures](signatures.md)
- [On-Chain Registry](on-chain-registry.md)
- [Security Model](security-model.md)
