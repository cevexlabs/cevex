import { Command } from 'commander'
import { existsSync, readFileSync } from 'fs'
import { CevexVerifier } from '@cevex/verify'
import type { SignedMessage } from '@cevex/core'

export const batchVerifyCommand = new Command('batch-verify')
  .description('Batch verify a list of signed messages')
  .requiredOption('--messages <path>', 'Path to JSON array of signed messages')
  .option('--network <network>', 'Network: base or base-sepolia', 'base')
  .option('--rpc <url>', 'Custom RPC URL')
  .option('--registry <address>', 'Override registry contract address')
  .action(async (opts) => {
    const msgsPath = opts.messages as string

    if (!existsSync(msgsPath)) {
      console.error(`Error: messages file not found: ${msgsPath}`)
      process.exit(1)
    }

    let rawMessages: unknown[]
    try {
      const content = readFileSync(msgsPath, 'utf8')
      rawMessages = JSON.parse(content)
      if (!Array.isArray(rawMessages)) throw new Error('Expected a JSON array')
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }

    const messages: SignedMessage[] = rawMessages.map((raw, i) => {
      const r = raw as Record<string, unknown>
      try {
        return {
          version: r['version'] as number,
          agentAddress: r['agentAddress'] as string,
          nonce: BigInt(r['nonce'] as string),
          timestamp: r['timestamp'] as number,
          action: Buffer.from(r['action'] as string, 'hex'),
          signature: {
            scheme: (r['signature'] as { scheme: string; bytes: string }).scheme as SignedMessage['signature']['scheme'],
            bytes: Buffer.from((r['signature'] as { scheme: string; bytes: string }).bytes, 'hex'),
          },
        }
      } catch (err) {
        throw new Error(`Message at index ${i} is malformed: ${err instanceof Error ? err.message : String(err)}`)
      }
    })

    const verifier = new CevexVerifier({
      network: opts.network as 'base' | 'base-sepolia',
      rpcUrl: opts.rpc,
    })

    console.log(`Batch verifying ${messages.length} messages...`)
    const result = await verifier.verifyBatch(messages)

    console.log(`  Valid:   ${result.verified}`)
    console.log(`  Invalid: ${result.failed}`)

    if (result.failed > 0) {
      console.log()
      result.results.forEach((r, i) => {
        if (!r.valid) {
          console.log(`  \x1b[31mFailed\x1b[0m: message[${i}] (${r.error ?? 'verification failed'})`)
        }
      })
    }

    process.exit(result.allValid ? 0 : 1)
  })
