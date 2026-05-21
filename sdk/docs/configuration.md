# Configuration

All configuration options for the CEVEX SDK.

---

## TypeScript

```typescript
import { CevexConfig } from '@cevex/sdk'

const config: CevexConfig = {
  // Target network. Default: 'base'
  network: 'base',

  // Custom RPC URL. If not set, uses the public Base RPC endpoint.
  rpcUrl: 'https://mainnet.base.org',

  // Registry contract address. Set to the canonical deployment or a custom registry.
  registryAddress: '0xRegistryAddress',

  // Cache resolved public keys locally to avoid repeated registry queries.
  // Default: true
  cachePublicKeys: true,

  // Public key cache TTL in seconds. Default: 3600
  cacheTtl: 3600,

  // Timeout per registry query in milliseconds. Default: 10000
  timeout: 10000,
}
```

---

## Python

```python
from cevex import CevexConfig

config = CevexConfig(
    network="base",
    rpc_url="https://mainnet.base.org",
    registry_address="0xRegistryAddress",
    cache_public_keys=True,
    cache_ttl=3600,
    timeout=10000,
)
```

---

## Networks

| Network | Chain ID | RPC | Registry |
|---|---|---|---|
| Base Mainnet | 8453 | `https://mainnet.base.org` | Canonical deployment address |
| Base Sepolia | 84532 | `https://sepolia.base.org` | Testnet deployment address |

---

## Entropy Sources

| Source | Description | Use |
|---|---|---|
| `hardware-qrng` | Hardware quantum random number generator | Production only |
| `software` | OS CSPRNG via `crypto.getRandomValues` | Development and testing only |

{% hint style="warning" %}
Never use `software` entropy in production. Keys derived from software entropy do not carry the physical unforgeability guarantee that is central to CEVEX's security model.
{% endhint %}

---

## See Also

- [Quickstart](quickstart.md)
- [API Reference](api-reference.md)
- [Error Reference](errors.md)
