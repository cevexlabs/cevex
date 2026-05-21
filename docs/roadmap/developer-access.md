# Phase 2: Developer Tools

{% hint style="info" %}
**Developer tools are active.** SDK packages, the CLI surface, the local demo, and GitBook reference are available in the repository.
{% endhint %}

This phase turns the core identity system into tools people can actually use. Developers can create an agent identity, sign an action, verify a message, and inspect registry state without needing to understand the cryptography internals first.

---

## Developer Surface

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003399', 'primaryTextColor': '#eff6ff', 'primaryBorderColor': '#1a7fff', 'lineColor': '#3d8bff', 'secondaryColor': '#001650', 'tertiaryColor': '#000d20', 'clusterBkg': '#001650', 'titleColor': '#eff6ff', 'edgeLabelBackground': '#001650'}}}%%
flowchart TB
    subgraph Core["Core Layer"]
        CORE["@cevex/core\nsigning and keys"]
        REG["@cevex/registry\nregistry client"]
    end

    subgraph Workflow["Workflow Layer"]
        AGENT["@cevex/agent\nset up and sign"]
        VERIFY["@cevex/verify\ncheck messages"]
    end

    subgraph Output["Developer Outputs"]
        CLI["@cevex/cli\nterminal commands"]
        PY["cevex\nPython SDK"]
        DEMO["examples\nlocal demo"]
    end

    CORE --> AGENT
    CORE --> VERIFY
    REG --> AGENT
    REG --> VERIFY
    AGENT --> CLI
    VERIFY --> CLI
    AGENT --> PY
    VERIFY --> PY
    CLI --> DEMO

    style CORE fill:#003399,color:#eff6ff,stroke:#1a7fff
    style AGENT fill:#003399,color:#eff6ff,stroke:#1a7fff
    style VERIFY fill:#003399,color:#eff6ff,stroke:#1a7fff
    style REG fill:#003399,color:#eff6ff,stroke:#1a7fff
    style CLI fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style DEMO fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style PY fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style Core fill:#001650,color:#eff6ff,stroke:#1a7fff
    style Workflow fill:#001650,color:#eff6ff,stroke:#1a7fff
    style Output fill:#001650,color:#eff6ff,stroke:#1a7fff
```

---

## Current Deliverables

| Deliverable | Purpose | Status |
|---|---|---|
| `@cevex/core` | Core signing, key, and entropy utilities | Implemented |
| `@cevex/agent` | Agent setup, signing, rotation, and revocation surface | Implemented |
| `@cevex/verify` | Single and batch message verification | Implemented |
| `@cevex/registry` | Base registry lookup and write helpers | Live Base Sepolia address |
| `@cevex/cli` | Terminal commands for the main workflows | Implemented |
| `cevex` Python | Python SDK matching the TypeScript shape | Active build |
| Examples | Local demo for onboarding and validation | Implemented |
| GitBook docs | Public reference for users and developers | Live |

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

## Message Format

Every SDK implementation turns a signed action into the same byte format before signing. This keeps messages consistent across apps and prevents replay or cross-use mistakes.

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

* [Phase 1: Core Identity](foundation.md)
* [Phase 3: Production Integrations](ecosystem-expansion.md)
* [Phase 4: Advanced Research](research-horizon.md)
