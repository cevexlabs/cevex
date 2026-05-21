/**
 * Key file encryption and decryption.
 *
 * Agent key files are encrypted with AES-256-GCM using a key derived from
 * a passphrase via scrypt. The file never contains the plaintext key.
 *
 * File format (JSON):
 * {
 *   "cevexKeyFile": "1",
 *   "agentAddress": "0xAgentAddress",
 *   "scheme": "dilithium3",
 *   "network": "base",
 *   "kdf": "scrypt",
 *   "salt": "<hex>",
 *   "iv": "<hex>",
 *   "encryptedKey": "<hex>"   // AES-256-GCM ciphertext of (publicKey_hex + ":" + secretKey_hex)
 * }
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import type { KeyPair, SignatureScheme } from '@cevex/core'

// scrypt parameters, deliberately conservative for key material
const SCRYPT_N = 1 << 17  // 131072
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 32   // 256-bit AES key
const IV_BYTES = 12        // 96-bit GCM IV (recommended)
const TAG_LENGTH = 16      // 128-bit GCM auth tag

export interface KeyFileData {
  cevexKeyFile: '1'
  agentAddress: string
  scheme: SignatureScheme
  network: string
  kdf: 'scrypt'
  salt: string
  iv: string
  encryptedKey: string
}

/**
 * Encrypt a keypair and save it to disk.
 */
export function saveKeyFile(
  path: string,
  keyPair: KeyPair,
  agentAddress: string,
  network: string,
  passphrase: string,
): void {
  const salt = randomBytes(32)
  const iv = randomBytes(IV_BYTES)

  const aesKey = deriveKey(passphrase, salt)

  // Encode both keys as hex joined by ':'
  const plaintext = toHex(keyPair.publicKey) + ':' + toHex(keyPair.secretKey)
  const plaintextBytes = Buffer.from(plaintext, 'utf8')

  const cipher = createCipheriv('aes-256-gcm', aesKey, iv)
  cipher.setAAD(Buffer.from(agentAddress, 'utf8'))

  const ciphertext = Buffer.concat([cipher.update(plaintextBytes), cipher.final()])
  const tag = cipher.getAuthTag()

  // Prepend the 16-byte auth tag to the ciphertext
  const encryptedKey = Buffer.concat([tag, ciphertext])

  const file: KeyFileData = {
    cevexKeyFile: '1',
    agentAddress,
    scheme: keyPair.scheme,
    network,
    kdf: 'scrypt',
    salt: toHex(salt),
    iv: toHex(iv),
    encryptedKey: toHex(encryptedKey),
  }

  writeFileSync(path, JSON.stringify(file, null, 2), 'utf8')
}

/**
 * Load and decrypt a key file from disk.
 */
export function loadKeyFile(
  path: string,
  passphrase: string,
): { keyPair: KeyPair; agentAddress: string; network: string } {
  const raw = readFileSync(path, 'utf8')
  const file = JSON.parse(raw) as KeyFileData

  if (file.cevexKeyFile !== '1') {
    throw new Error('Not a CEVEX key file (missing cevexKeyFile: "1")')
  }

  const salt = fromHex(file.salt)
  const iv = fromHex(file.iv)
  const encryptedKey = fromHex(file.encryptedKey)

  const aesKey = deriveKey(passphrase, salt)

  // Split auth tag from ciphertext
  const tag = encryptedKey.slice(0, TAG_LENGTH)
  const ciphertext = encryptedKey.slice(TAG_LENGTH)

  let plaintext: string
  try {
    const decipher = createDecipheriv('aes-256-gcm', aesKey, iv)
    decipher.setAAD(Buffer.from(file.agentAddress, 'utf8'))
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    plaintext = decrypted.toString('utf8')
  } catch {
    throw new Error('Failed to decrypt key file. Wrong passphrase?')
  }

  const [publicKeyHex, secretKeyHex] = plaintext.split(':')
  if (!publicKeyHex || !secretKeyHex) {
    throw new Error('Key file has unexpected format after decryption.')
  }

  const keyPair: KeyPair = {
    publicKey: fromHex(publicKeyHex),
    secretKey: fromHex(secretKeyHex),
    scheme: file.scheme,
  }

  return { keyPair, agentAddress: file.agentAddress, network: file.network }
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  }) as Buffer
}

function toHex(bytes: Uint8Array | Buffer): string {
  return Buffer.from(bytes).toString('hex')
}

function fromHex(hex: string): Buffer {
  return Buffer.from(hex, 'hex')
}
