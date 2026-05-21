import { Command } from 'commander'
import { createInterface } from 'readline'
import { existsSync } from 'fs'
import { CevexAgent } from '@cevex/agent'
import { loadKeyFile } from '../keyfile'

export const revokeCommand = new Command('revoke')
  .description('Permanently revoke an agent identity (irreversible)')
  .requiredOption('--key <path>', 'Path to encrypted agent key file')
  .option('--reason <text>', 'Reason for revocation (stored in the signature)')
  .option('--rpc <url>', 'Custom RPC URL')
  .option('--deployer-key <key>', 'Deployer wallet private key for paying gas')
  .option('--registry <address>', 'Override registry contract address')
  .option('--yes', 'Skip confirmation prompt')
  .action(async (opts) => {
    const keyPath = opts.key as string

    if (!existsSync(keyPath)) {
      console.error(`Error: key file not found: ${keyPath}`)
      process.exit(1)
    }

    const passphrase = await promptPassphrase('Passphrase: ')
    let keyFileData: ReturnType<typeof loadKeyFile>
    try {
      keyFileData = loadKeyFile(keyPath, passphrase)
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }

    console.log()
    console.log(`Revoking agent identity ${keyFileData.agentAddress}`)
    console.log('This action is permanent and cannot be undone.')
    console.log()

    if (!opts.yes) {
      const confirmed = await confirm('Confirm? [y/N]: ')
      if (!confirmed) {
        console.log('Aborted.')
        process.exit(0)
      }
    }

    const deployerKey = (opts.deployerKey ?? process.env['CEVEX_DEPLOYER_KEY']) as `0x${string}` | undefined

    const agent = await CevexAgent.fromKeyPair(keyFileData.keyPair, {
      network: keyFileData.network,
      rpcUrl: opts.rpc,
      deployerKey,
      registryAddress: opts.registry,
    })

    let txHash: string
    try {
      const result = await agent.revoke({ reason: opts.reason })
      txHash = result.txHash
    } catch (err) {
      console.error(`Revocation failed: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }

    console.log()
    console.log('Revocation submitted.')
    console.log(`Tx hash: ${txHash}`)
    console.log(`Agent ${agent.address} is now revoked on ${keyFileData.network}.`)
  })

async function promptPassphrase(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}
