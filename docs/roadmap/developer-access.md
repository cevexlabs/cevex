# Developer Access

{% hint style="info" %}
**Active delivery.** The TypeScript packages, CLI surface, local validation demo, and GitBook reference are now available in the repository.
{% endhint %}

The protocol layer is useful only when developers can provision identities, sign actions, verify messages, and inspect registry state without handling raw lattice internals. Developer Access packages the CEVEX primitives into interfaces that are practical for agent operators and application teams.

---

## Developer Surface

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003399', 'primaryTextColor': '#eff6ff', 'primaryBorderColor': '#1a7fff', 'lineColor': '#3d8bff', 'secondaryColor': '#001650', 'tertiaryColor': '#000d20', 'clusterBkg': '#001650', 'titleColor': '#eff6ff', 'edgeLabelBackground': '#001650'}}}%%
graph LR
    subgraph Packages["TypeScript Packages"]
        CORE["@cevex/core\ncrypto primitives"]
        AGENT["@cevex/agent\nprovision and sign"]
        VERIFY["@cevex/verify\nsingle and batch verify"]
        REG["@cevex/registry\nBase client"]
    end

    subgraph Tools["Tools"]
        CLI["@cevex/cli\nterminal workflow"]
        DEMO["examples\nlocal validation"]
    end

    subgraph Python["Python"]
        PY["cevex\nAPI parity target"]
    end

    CORE --> AGENT
    CORE --> VERIFY
    REG --> AGENT
    REG --> VERIFY
    AGENT --> CLI
    VERIFY --> CLI
    CORE --> DEMO
    AGENT --> PY
    VERIFY --> PY

    style CORE fill:#003399,color:#eff6ff,stroke:#1a7fff
    style AGENT fill:#003399,color:#eff6ff,stroke:#1a7fff
    style VERIFY fill:#003399,color:#eff6ff,stroke:#1a7fff
    style REG fill:#003399,color:#eff6ff,stroke:#1a7fff
    style CLI fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style DEMO fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style PY fill:#001650,color:#7dd3fc,stroke:#3d8bff
```

---

## Current Deliverables

| Deliverable | Purpose | Status |
|---|---|---|
| `@cevex/core` | Dilithium, FALCON guarded interface, SHAKE-256, entropy types | Implemented |
| `@cevex/agent` | Provisioning, message signing, key rotation, revocation surface | Implemented |
| `@cevex/verify` | Single verification, batch verification, transcript interface | Implemented |
| `@cevex/registry` | Base RPC client, identity lookup, registry writes | Source ready |
| `@cevex/cli` | Provision, sign, verify, rotate, revoke, inspect | Implemented |
| `cevex` Python | Python SDK with TypeScript API parity | Active build |
| Examples | Local protocol validation and developer onboarding | Implemented |
| GitBook docs | Public protocol and integration reference | Live |

---

## Message Validation Path

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003399', 'primaryTextColor': '#eff6ff', 'primaryBorderColor': '#1a7fff', 'lineColor': '#3d8bff', 'secondaryColor': '#001650', 'tertiaryColor': '#000d20', 'actorBkg': '#003399', 'actorBorder': '#1a7fff', 'actorTextColor': '#eff6ff', 'actorLineColor': '#3d8bff', 'signalColor': '#7dd3fc', 'signalTextColor': '#eff6ff', 'labelBoxBkgColor': '#001650', 'labelBoxBorderColor': '#1a7fff', 'labelTextColor': '#eff6ff', 'noteBorderColor': '#1a7fff', 'noteBkgColor': '#001650', 'noteTextColor': '#eff6ff'}}}%%
sequenceDiagram
    participant A as Agent SDK
    participant R as Registry Client
    participant V as Verifier
    participant B as Base Registry

    A->>A: Build canonical CEVEX-MSG-v1 bytes
    A->>A: Sign with ML-DSA secret key
    A-->>V: signed message
    V->>B: getPublicKey(agentAddress)
    B-->>V: public key and scheme
    V->>B: isActive(agentAddress)
    B-->>V: active state
    V->>V: Verify(pk, signedBytes, signature)
    V-->>A: valid or invalid
```

---

## Canonical Bytes

Every SDK implementation must produce the same byte sequence before signing:

```text
CEVEX-MSG-v1 ||
version:uint8 ||
agentAddress:bytes20 ||
nonce:uint64be ||
timestamp:uint64be ||
actionLength:uint32be ||
action:bytes
```

The signature relation is:

$$\sigma \leftarrow \text{Sign}_{sk}\!\left(\text{Encode}_{\text{CEVEX-MSG-v1}}(m)\right)$$

Verification accepts only if:

$$\text{Verify}_{pk}\!\left(\text{Encode}_{\text{CEVEX-MSG-v1}}(m),\sigma\right)=1$$

---

## Acceptance Criteria

| Area | Requirement |
|---|---|
| SDK | Deterministic message encoding across TypeScript and Python |
| CLI | End-to-end provision, sign, verify, rotate, revoke workflows |
| Registry | Configurable network, RPC URL, and registry address |
| Examples | Local keygen, signing, verification, tamper rejection, and JSON output |
| Security | Secret key material never printed in examples or logs |
| Documentation | All commands and API surfaces match implementation |

---

## Next

* [Foundation](foundation.md)
* [Ecosystem Expansion](ecosystem-expansion.md)
* [Research Horizon](research-horizon.md)
