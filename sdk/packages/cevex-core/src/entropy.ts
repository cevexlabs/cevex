/**
 * Entropy sampling.
 *
 * Provides a unified interface for sampling entropy from multiple sources:
 *
 * - 'software'       OS CSPRNG via Node.js crypto.randomBytes. Suitable for
 *                    development and testing. Not approved for production CEVEX keys.
 *
 * - 'hardware-qrng'  Hardware quantum random number generator. Interfaces with
 *                    a QRNG device or API specified by the CEVEX_QRNG_URL environment
 *                    variable. Throws ENTROPY_FAILURE if CEVEX_QRNG_URL is not set.
 *
 * To connect a hardware QRNG:
 *   export CEVEX_QRNG_URL=https://your-qrng-endpoint/random?length=64&format=hex
 *
 * The endpoint must return a JSON body { "data": "<hex string>" } where the hex
 * string encodes the requested number of random bytes.
 *
 * Tested providers:
 *   - ANU QRNG:        https://quantumnumbers.anu.edu.au
 *   - ID Quantique:    https://qrng.idquantique.com
 *   - Local device:    Any QRNG with a compatible HTTP interface
 */

import { randomBytes } from 'crypto'

/** Minimum recommended entropy bytes for key derivation. */
export const MIN_ENTROPY_BYTES = 64

class EntropyError extends Error {
  readonly code = 'ENTROPY_FAILURE'
  constructor(message: string) {
    super(message)
    this.name = 'EntropyError'
  }
}

/**
 * Sample entropy from the specified source.
 *
 * @param source    'hardware-qrng' or 'software'.
 * @param bytes     Number of bytes to sample. Default: 64.
 */
export async function sampleEntropy(
  source: 'hardware-qrng' | 'software',
  bytes: number = MIN_ENTROPY_BYTES,
): Promise<Uint8Array> {
  if (bytes < 32) {
    throw new EntropyError(`sampleEntropy: requested ${bytes} bytes but minimum is 32`)
  }

  if (source === 'software') {
    return new Uint8Array(randomBytes(bytes))
  }

  // hardware-qrng: interface with external QRNG device or API
  const qrngUrl = process.env['CEVEX_QRNG_URL']

  if (qrngUrl) {
    return await fetchQrngEntropy(qrngUrl, bytes)
  }

  // No QRNG URL configured — fail loudly rather than silently downgrade
  throw new EntropyError(
    'hardware-qrng entropy requested but CEVEX_QRNG_URL is not set.\n' +
    'Set CEVEX_QRNG_URL to a QRNG API endpoint, or use entropySource: "software" for development.\n' +
    'Example: export CEVEX_QRNG_URL=https://your-qrng-endpoint/random?length=64&format=hex',
  )
}

async function fetchQrngEntropy(url: string, bytes: number): Promise<Uint8Array> {
  const endpoint = url.replace('{bytes}', String(bytes))

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    throw new EntropyError(
      `QRNG fetch failed: ${err instanceof Error ? err.message : String(err)}\n` +
      `Endpoint: ${endpoint}`,
    )
  }

  if (!response.ok) {
    throw new EntropyError(
      `QRNG endpoint returned HTTP ${response.status}. Check CEVEX_QRNG_URL.`,
    )
  }

  const body = await response.json() as { data?: string; random?: string; bytes?: string }

  // Support common response formats from different QRNG providers
  const hex = body.data ?? body.random ?? body.bytes
  if (!hex || typeof hex !== 'string') {
    throw new EntropyError(
      'QRNG response did not contain a "data", "random", or "bytes" hex field.',
    )
  }

  const result = hexToBytes(hex)
  if (result.length < bytes) {
    throw new EntropyError(
      `QRNG returned ${result.length} bytes but ${bytes} were requested.`,
    )
  }

  return result.slice(0, bytes)
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  if (clean.length % 2 !== 0) {
    throw new EntropyError('QRNG returned an odd-length hex string')
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
