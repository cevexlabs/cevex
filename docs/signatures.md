# Post-Quantum Signatures

CEVEX authenticates agent operations using post-quantum digital signature schemes. The active implementation path uses CRYSTALS-Dilithium. FALCON remains part of the protocol design as a reserved secondary scheme for a later audited release.

---

## Implementation Status

| Scheme | Standard | Role | Repository status |
|---|---|---|---|
| CRYSTALS-Dilithium | NIST FIPS 204, ML-DSA family | Default signing path | Implemented |
| FALCON | NIST FIPS 206, FN-DSA family | Compact secondary path | Reserved interface |

---

## Scheme Comparison

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003399', 'primaryTextColor': '#eff6ff', 'primaryBorderColor': '#1a7fff', 'lineColor': '#3d8bff', 'secondaryColor': '#001650', 'tertiaryColor': '#000d20', 'clusterBkg': '#001650', 'titleColor': '#eff6ff', 'edgeLabelBackground': '#001650'}}}%%
graph LR
    SK["Secret Key sk"]

    subgraph Dilithium["CRYSTALS-Dilithium (NIST FIPS 204)"]
        D1["Security: Module LWE + Module SIS"]
        D2["Sig size: 3293 bytes (level 3)"]
        D3["Signing: Fast"]
        D4["Use: Default active scheme"]
    end

    subgraph Falcon["FALCON (NIST FIPS 206)"]
        F1["Security: NTRU Lattice"]
        F2["Sig size: 666 bytes (level 2)"]
        F3["Signing: Slower (Gaussian sampler)"]
        F4["Use: Reserved compact scheme"]
    end

    SIG["Signature sigma"]

    SK --> Dilithium
    SK --> Falcon
    Dilithium --> SIG
    Falcon --> SIG

    style SK fill:#003399,color:#eff6ff,stroke:#1a7fff
    style SIG fill:#003399,color:#eff6ff,stroke:#1a7fff
    style D1 fill:#003399,color:#eff6ff,stroke:#1a7fff
    style D2 fill:#003399,color:#eff6ff,stroke:#1a7fff
    style D3 fill:#003399,color:#eff6ff,stroke:#1a7fff
    style D4 fill:#003399,color:#eff6ff,stroke:#1a7fff
    style F1 fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style F2 fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style F3 fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style F4 fill:#001650,color:#7dd3fc,stroke:#3d8bff
```

---

## CRYSTALS-Dilithium (NIST FIPS 204)

Dilithium is the primary signing scheme in CEVEX. Its security reduces to the hardness of Module LWE and Module SIS over polynomial rings.

### Signing Flow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003399', 'primaryTextColor': '#eff6ff', 'primaryBorderColor': '#1a7fff', 'lineColor': '#3d8bff', 'secondaryColor': '#001650', 'tertiaryColor': '#000d20', 'actorBkg': '#003399', 'actorBorder': '#1a7fff', 'actorTextColor': '#eff6ff', 'actorLineColor': '#3d8bff', 'signalColor': '#7dd3fc', 'signalTextColor': '#eff6ff', 'labelBoxBkgColor': '#001650', 'labelBoxBorderColor': '#1a7fff', 'labelTextColor': '#eff6ff', 'noteBorderColor': '#1a7fff', 'noteBkgColor': '#001650', 'noteTextColor': '#eff6ff', 'activationBorderColor': '#1a7fff', 'activationBkgColor': '#003399'}}}%%
sequenceDiagram
    participant A as Agent
    participant P as Protocol

    A->>P: Sign(sk, m)
    P->>P: Sample masking vector y
    P->>P: Compute commitment w = Ay
    P->>P: Compute challenge c = H(tr || m || HighBits(w))
    P->>P: Compute response z = y + c*s1
    P->>P: Check: norm(z) < gamma_1 - beta?
    alt Coefficients too large
        P->>P: ABORT. Resample y.
    else Accepted
        P->>P: Compute hints h
        P-->>A: sigma = (c, z, h)
    end

    Note over P: Abort ensures z is independent of sk
```

The abort mechanism is the key security primitive. Accepted responses are statistically independent of the secret key, so an adversary observing many signatures learns nothing about $\mathbf{s}_1$.

### Verification

$$\mathbf{w}_1' = \text{UseHint}(\mathbf{h},\ \mathbf{A}\mathbf{z} - c\mathbf{t}_1 \cdot 2^d,\ 2\gamma_2)$$

Accept if $\tilde{c} = H(\mu \| \mathbf{w}_1')$ and $\|\mathbf{z}\|_\infty < \gamma_1 - \beta$.

---

## FALCON Release Path (NIST FIPS 206)

FALCON uses a different lattice structure: the NTRU lattice. Signing is equivalent to solving a closest vector problem using a trapdoor short basis. CEVEX keeps the public interface reserved so applications can understand the planned scheme boundary without treating it as the active signing path.

**Key generation:**

$$h = g \cdot f^{-1} \pmod{q}$$

where $f, g$ are short polynomials forming the trapdoor. The public key $h$ defines the NTRU lattice but reveals nothing about $f$ and $g$.

**Signing:**

$$\sigma = \text{SamplePre}(\mathbf{B},\ H(r \| m))$$

A Gaussian preimage is sampled over the lattice using the trapdoor basis.

**Verification:**

$$\mathbf{s}_1 + h \cdot \mathbf{s}_2 = H(r \| m) \pmod{q}$$

Check that $(\mathbf{s}_1, \mathbf{s}_2)$ is short and the equation holds.

---

## Reference Performance Profile

| Operation | Dilithium-3 | FALCON-512 |
|-----------|-------------|------------|
| Key generation | 0.12 ms | 8.2 ms |
| Signing | 0.17 ms | 0.31 ms |
| Verification | 0.10 ms | 0.09 ms |
| Signatures per second | ~5,800 | ~3,200 |
| Signature size | 3293 B | 666 B |

The active developer path should use Dilithium. FALCON's smaller signatures remain valuable for high-frequency agents where calldata size matters, subject to a production-ready implementation and review.

---

## Replay Protection

All CEVEX signatures include a nonce bound to the specific message via a domain separation prefix:

$$\sigma = \text{Sign}(sk,\ \text{"CEVEX-MSG-v1"} \| \text{agentAddr} \| \text{nonce} \| \text{timestamp} \| \text{action})$$

A valid signature on message $m$ cannot be reused for any other message. High-frequency agents can sign at machine speed without coordination overhead.

---

## See Also

- [Key Generation](key-generation.md)
- [Trustless Verification](verification.md)
- [Cryptographic Primitives](cryptographic-primitives.md)
