import { Command } from 'commander'
import { existsSync, readFileSync } from 'fs'
import { CevexVerifier } from '@cevex/verify'
import type { SignedMessage } from '@cevex/core'

export const verifyCommand = new Command('verify')
  .description('Verify a signed CEVEX message')
  .requiredOption('--message <path>', 'Path to signed message JSON file')
  .option('--network <network>', 'Network: base or base-sepolia', 'base')
  .option('--rpc <url>', 'Custom RPC URL')
  .option('--registry <address>', 'Override registry contract address')
  .action(async (opts) => {
    const msgPath = opts.message as string

    if (!existsSync(msgPath)) {
      console.error(`Error: message file not found: ${msgPath}`)
      process.exit(1)
    }

    let raw: Record<string, unknown>
    try {
      raw = JSON.parse(readFileSync(msgPath, 'utf8'))
    } catch {
      console.error('Error: failed to parse message file as JSON')
      process.exit(1)
    }

    // Deserialize signed message
    let signed: SignedMessage
    try {
      signed = {
        version: raw['version'] as number,
        agentAddress: raw['agentAddress'] as string,
        nonce: BigInt(raw['nonce'] as string),
        timestamp: raw['timestamp'] as number,
        action: Buffer.from(raw['action'] as string, 'hex'),
        signature: {
          scheme: (raw['signature'] as { scheme: string; bytes: string }).scheme as SignedMessage['signature']['scheme'],
          bytes: Buffer.from((raw['signature'] as { scheme: string; bytes: string }).bytes, 'hex'),
        },
      }
    } catch (err) {
      console.error(`Error: malformed signed message: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }

    const verifier = new CevexVerifier({
      network: opts.network as 'base' | 'base-sepolia',
      rpcUrl: opts.rpc,
    })

    console.log('Verifying signature...')
    const result = await verifier.verify(signed)

    console.log()
    console.log(`  Agent:    ${result.agentAddress}`)
    console.log(`  Scheme:   ${result.scheme}`)
    console.log(`  Active:   ${result.active ? 'yes' : 'no'}`)
    console.log(`  Valid:    ${result.valid ? '\x1b[32mYES\x1b[0m' : '\x1b[31mNO\x1b[0m'}`)

    if (result.error) {
      console.log(`  Error:    ${result.error}`)
    }

    process.exit(result.valid ? 0 : 1)
  })
