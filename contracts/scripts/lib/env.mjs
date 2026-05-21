import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

export function loadEnv(path) {
  const file = resolve(path)
  if (!existsSync(file)) return

  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const index = trimmed.indexOf('=')
    if (index < 1) continue

    const key = trimmed.slice(0, index).trim()
    const raw = trimmed.slice(index + 1).trim()
    const value = raw.replace(/^["']|["']$/g, '')

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

export function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing ${name}. Set it in contracts/.env or in the shell.`)
  }
  return value
}

export function normalizePrivateKey(value) {
  const key = value.startsWith('0x') ? value : `0x${value}`
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('DEPLOYER_PRIVATE_KEY must be a 32-byte hex private key.')
  }
  if (/^0x0{64}$/.test(key)) {
    throw new Error('DEPLOYER_PRIVATE_KEY is still the placeholder value from .env.example.')
  }
  return key
}
