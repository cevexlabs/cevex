# Phase 3: Production Integrations

{% hint style="warning" %}
**Production integrations come next.** This phase moves CEVEX from local tools into production environments with audit records, secure key storage, and operator controls.
{% endhint %}

This phase is about making CEVEX easier to run in real systems. It adds stronger operational workflows for teams that need auditability, cross-chain identity lookup, hardware-backed custody, and policy controls.

---

## Integration Map

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003399', 'primaryTextColor': '#eff6ff', 'primaryBorderColor': '#1a7fff', 'lineColor': '#3d8bff', 'secondaryColor': '#001650', 'tertiaryColor': '#000d20', 'clusterBkg': '#001650', 'titleColor': '#eff6ff', 'edgeLabelBackground': '#001650'}}}%%
graph TD
    BASE["Base Registry\nsource of truth"]
    AUDIT["Private Audit Records\nvalidity without disclosure"]
    BRIDGE["Cross-Chain Lookup\nstate proof based"]
    HSM["Hardware Key Storage\nproduction custody"]
    TEE["Isolated Signing\nsecure runtime"]
    OPS["Operator Controls\npolicy and monitoring"]

    BASE --> AUDIT
    BASE --> BRIDGE
    BASE --> HSM
    BASE --> TEE
    HSM --> OPS
    TEE --> OPS
    AUDIT --> OPS
    BRIDGE --> OPS

    style BASE fill:#003399,color:#eff6ff,stroke:#1a7fff
    style AUDIT fill:#003399,color:#eff6ff,stroke:#1a7fff
    style BRIDGE fill:#003399,color:#eff6ff,stroke:#1a7fff
    style HSM fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style TEE fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style OPS fill:#001650,color:#7dd3fc,stroke:#3d8bff
```

---

## Private Audit Records

A CEVEX signature proves that an agent authorized a message. Private audit records extend this by allowing a verifier to prove that a set of signatures was valid without revealing each message.

For a signed message $(m,\sigma,pk)$, the proof target is:

$$\pi \leftarrow \text{Prove}\!\left(\exists z,c:\mathbf{Az}-c\mathbf{t}_1 2^d \equiv \mathbf{w}' \pmod q \land H(\mu\|\mathbf{w}'_1)=\tilde c\right)$$

For batch audit workflows:

$$|\pi_{\text{agg}}| = O(\log n)$$

$$T_{\text{verify}} = O(\log n)$$

---

## Cross-Chain Lookup

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003399', 'primaryTextColor': '#eff6ff', 'primaryBorderColor': '#1a7fff', 'lineColor': '#3d8bff', 'secondaryColor': '#001650', 'tertiaryColor': '#000d20', 'clusterBkg': '#001650', 'titleColor': '#eff6ff', 'edgeLabelBackground': '#001650'}}}%%
graph LR
    BASE["CevexRegistry\nBase"]
    ROOT["State Root\nEthereum L1"]
    PROOF["Merkle Inclusion Proof"]
    ETH["Ethereum Mirror"]
    ARB["Arbitrum Mirror"]
    OP["Optimism Mirror"]

    BASE -->|state commitment| ROOT
    ROOT --> PROOF
    PROOF --> ETH
    PROOF --> ARB
    PROOF --> OP

    style BASE fill:#003399,color:#eff6ff,stroke:#1a7fff
    style ROOT fill:#003399,color:#eff6ff,stroke:#1a7fff
    style PROOF fill:#003399,color:#eff6ff,stroke:#1a7fff
    style ETH fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style ARB fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style OP fill:#001650,color:#7dd3fc,stroke:#3d8bff
```

Mirrors resolve agent identities outside Base using verifiable state proofs. The design target is no trusted relayer, no mirror admin key, and no manual registry reconciliation.

---

## Secure Key Storage

| Backend | Purpose | Target Behavior |
|---|---|---|
| HSM | Protect long-lived production signing keys | `Sign()` runs inside hardware boundary |
| TEE | Isolate signing inside trusted execution | Secret key remains sealed to enclave |
| Policy engine | Restrict allowed agent actions | Rejects unauthorized payloads before signing |
| Monitoring | Detect unexpected signing patterns | Emits alerts for policy drift |

---

## Delivery Targets

| Deliverable | Outcome |
|---|---|
| Private audit records | Validity proof without message disclosure |
| High-volume audit proofs | Efficient proof for large batches of agent activity |
| Cross-chain lookup | Agent identity resolution beyond Base |
| Hardware key storage | Production key custody backend |
| Isolated signing | Secure runtime for autonomous agents |
| Operator controls | Policies, monitoring, and emergency revocation workflows |

---

## Next

* [Phase 1: Core Identity](foundation.md)
* [Phase 2: Developer Tools](developer-access.md)
* [Phase 4: Advanced Research](research-horizon.md)
