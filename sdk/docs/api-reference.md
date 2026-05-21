# API Reference

Full TypeScript and Python API documentation for all CEVEX SDK packages.

{% hint style="info" %}
This document is being completed alongside the SDK release. See [Quickstart](quickstart.md) for working examples today.
{% endhint %}

---

## TypeScript

### `CevexAgent`

```typescript
class CevexAgent {
  readonly address: string
  readonly scheme: SignatureScheme
  readonly network: string

  static provision(options: ProvisionOptions): Promise<CevexAgent>
  static fromSecretKey(secretKey: Uint8Array, scheme: SignatureScheme, options?): Promise<CevexAgent>

  sign(options: SignOptions): Promise<SignedMessage>
  rotateKey(options: RotateKeyOptions): Promise<{ rotationTxHash: string }>
  revoke(options?: RevokeOptions): Promise<{ txHash: string }>
}
```

### `CevexVerifier`

```typescript
class CevexVerifier {
  constructor(options?: VerifierOptions)

  verify(message: SignedMessage): Promise<VerificationResult>
  verifyBatch(messages: SignedMessage[]): Promise<BatchVerificationResult>
  clearCache(): void
}
```

### Types

```typescript
type SignatureScheme = 'dilithium2' | 'dilithium3' | 'dilithium5' | 'falcon512' | 'falcon1024'
type EntropySource = 'hardware-qrng' | 'software'

interface SignedMessage {
  version: number
  agentAddress: string
  nonce: bigint
  timestamp: number
  action: Uint8Array
  signature: Signature
}

interface VerificationResult {
  valid: boolean
  active: boolean
  scheme: SignatureScheme
  agentAddress: string
  error?: string
}
```

---

## Python

### `CevexAgent`

```python
class CevexAgent:
    address: str
    scheme: str
    network: str

    @classmethod
    async def provision(cls, entropy_source, scheme, network, metadata, rpc_url) -> CevexAgent: ...

    @classmethod
    async def from_secret_key(cls, secret_key, scheme, network, rpc_url) -> CevexAgent: ...

    async def sign(self, action) -> SignedMessage: ...
    async def rotate_key(self, entropy_source, reason) -> dict: ...
    async def revoke(self, reason) -> dict: ...
```

### `CevexVerifier`

```python
class CevexVerifier:
    def __init__(self, network, rpc_url, cache_public_keys, cache_ttl): ...

    async def verify(self, message: SignedMessage) -> VerificationResult: ...
    async def verify_batch(self, messages: list[SignedMessage]) -> BatchVerificationResult: ...
```

---

## See Also

- [Quickstart](quickstart.md)
- [Examples](examples.md)
- [Error Reference](errors.md)
