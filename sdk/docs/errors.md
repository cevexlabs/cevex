# Error Reference

All error codes thrown by the CEVEX SDK and how to handle them.

---

## Error Class

```typescript
import { CevexError, ErrorCode } from '@cevex/sdk'

try {
  const result = await verifier.verify(signed)
} catch (err) {
  if (err instanceof CevexError) {
    console.log(err.code)     // ErrorCode enum value
    console.log(err.message)  // Human-readable description
  }
}
```

---

## Error Codes

| Code | Description | How to handle |
|---|---|---|
| `IDENTITY_NOT_FOUND` | No agent registered at this address on the Base registry | Check the agent address is correct and was provisioned on the right network |
| `IDENTITY_REVOKED` | The agent identity has been permanently revoked | Reject the action. The identity cannot be reactivated. |
| `SIGNATURE_INVALID` | Lattice verification failed | The signature does not match the message and public key. Reject the action. |
| `NONCE_REPLAY` | The nonce has been seen before | The message is a replay. Reject the action. |
| `SCHEME_MISMATCH` | Signature scheme does not match the registered scheme | The signature was produced with a different scheme than the one registered on-chain |
| `REGISTRY_UNAVAILABLE` | Could not reach the Base registry | Retry with backoff or use a cached public key if available |
| `ENTROPY_FAILURE` | Hardware QRNG health test failed | Do not proceed. The entropy source has failed its continuous health test. |
| `KEY_SIZE_INVALID` | Public key length does not match the declared scheme | The key material is malformed |
| `NETWORK_MISMATCH` | Signed message references a different network | The message was signed for a different chain |

---

## Python

```python
from cevex.exceptions import (
    CevexError,
    IdentityNotFoundError,
    IdentityRevokedError,
    SignatureInvalidError,
    NonceReplayError,
    RegistryUnavailableError,
    EntropyFailureError,
)

try:
    result = await verifier.verify(signed)
except IdentityRevokedError:
    print("Agent has been revoked")
except SignatureInvalidError:
    print("Signature verification failed")
except CevexError as e:
    print(f"CEVEX error: {e}")
```

---

## See Also

- [API Reference](api-reference.md)
- [Quickstart](quickstart.md)
