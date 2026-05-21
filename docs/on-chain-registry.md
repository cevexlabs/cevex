# On-Chain Registry

CEVEX agent identities are anchored on Base as smart contracts. The registry provides a decentralized, append-only record of all provisioned agent public keys, with Ethereum-secured finality and permissionless read access.

---

## Registry Architecture

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003399', 'primaryTextColor': '#eff6ff', 'primaryBorderColor': '#1a7fff', 'lineColor': '#3d8bff', 'secondaryColor': '#001650', 'tertiaryColor': '#000d20', 'clusterBkg': '#001650', 'titleColor': '#eff6ff', 'edgeLabelBackground': '#001650'}}}%%
graph LR
    subgraph Provisioning["Agent Provisioning"]
        K["Key Generation\nquantum entropy"]
        P["Public Key pk"]
    end

    subgraph Base["Base Network"]
        R["CevexRegistry\nSingleton Contract"]
        A["AgentIdentity\nPer-agent record"]
        E["Event Log\nRegistered / Rotated / Revoked"]
    end

    subgraph Verifier["Any Verifier"]
        Q["getPublicKey(agent)"]
        CV["Local Key Cache\nsynced via events"]
    end

    K --> P
    P -->|registerAgent| R
    R -->|stores| A
    R -->|emits| E
    Q -->|reads| A
    E -->|subscribe| CV

    style K fill:#003399,color:#eff6ff,stroke:#1a7fff
    style P fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style R fill:#003399,color:#eff6ff,stroke:#1a7fff
    style A fill:#003399,color:#eff6ff,stroke:#1a7fff
    style E fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style Q fill:#003399,color:#eff6ff,stroke:#1a7fff
    style CV fill:#001650,color:#7dd3fc,stroke:#3d8bff
```

---

## Identity Lifecycle

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003399', 'primaryTextColor': '#eff6ff', 'primaryBorderColor': '#1a7fff', 'lineColor': '#3d8bff', 'secondaryColor': '#001650', 'tertiaryColor': '#000d20', 'clusterBkg': '#001650', 'titleColor': '#eff6ff', 'edgeLabelBackground': '#001650'}}}%%
graph TD
    PROV["PROVISIONED\nregisterAgent called\npk anchored on Base"]
    ACTIVE["ACTIVE\nSigning operations live\nVerification succeeds"]
    ROTATED["KEY ROTATED\nFresh keypair from QRNG\nSame on-chain address"]
    REVOKED["REVOKED\nPermanent, irreversible\nHistorical sigs preserved"]

    PROV -->|Ethereum confirmation| ACTIVE
    ACTIVE -->|rotateKey + sig under current sk| ROTATED
    ROTATED -->|Returns to| ACTIVE
    ACTIVE -->|revokeAgent + sig under current sk| REVOKED

    style PROV fill:#003399,color:#eff6ff,stroke:#1a7fff
    style ACTIVE fill:#003399,color:#eff6ff,stroke:#1a7fff
    style ROTATED fill:#001650,color:#7dd3fc,stroke:#3d8bff
    style REVOKED fill:#001650,color:#7dd3fc,stroke:#3d8bff
```

---

## Agent Address Derivation

Each agent identity maps to a deterministic on-chain address:

$$\text{agentAddress} = \text{keccak256}(\text{pk})[-20\text{ bytes}]$$

The same public key always produces the same address. Two agents with different public keys always have different addresses. The address is computable from the public key without querying the registry.

---

## Core Interface

```solidity
function registerAgent(
    bytes calldata publicKey,
    uint8 scheme,           // 0 = Dilithium, 1 = FALCON
    uint8 securityLevel,    // 2, 3, or 5
    bytes32 metadataHash
) external returns (address agentAddress);

function rotateKey(
    address agentAddress,
    bytes calldata newPublicKey,
    bytes calldata rotationSignature
) external;

function revokeAgent(
    address agentAddress,
    bytes calldata revocationSignature
) external;

function getPublicKey(address agentAddress)
    external view returns (bytes memory publicKey, uint8 scheme);

function isActive(address agentAddress) external view returns (bool);
```

Full contract source: [contracts/CevexRegistry.sol](../contracts/CevexRegistry.sol)

---

## Base Network Rationale

**Ethereum security.** Base posts state roots to Ethereum L1. The registry has the same finality guarantees as Ethereum mainnet without L1 gas costs.

**EVM compatibility.** Any EVM library can query agent identities. No special tooling required.

**Transaction costs.** Agent registration costs under $0.01 at typical Base gas prices.

**No admin key.** The registry is immutable once deployed. No upgrade mechanism, no proxy pattern, no admin that can modify records.

---

## Reading the Registry

```typescript
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const client = createPublicClient({ chain: base, transport: http() })

const { publicKey, scheme } = await client.readContract({
  address: CEVEX_REGISTRY_ADDRESS,
  abi: CEVEX_REGISTRY_ABI,
  functionName: 'getPublicKey',
  args: [agentAddress]
})
```

---

## See Also

- [Trustless Verification](verification.md)
- [Key Generation](key-generation.md)
- [Security Model](security-model.md)
- [CevexRegistry.sol](../contracts/CevexRegistry.sol)
