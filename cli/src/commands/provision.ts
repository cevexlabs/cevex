import { Command } from 'commander'
import { createInterface } from 'readline'
import { existsSync, readFileSync } from 'fs'
import { CevexAgent } from '@cevex/agent'
import type { SignatureScheme } from '@cevex/core'
import { saveKeyFile } from '../keyfile'

export const provisionCommand = new Command('provision')
  .description('Provision a new agent identity on Base')
  .option('--entropy <source>', 'Entropy source: hardware-qrng or software', 'hardware-qrng')
  .option('--scheme <scheme>', 'Signature scheme: dilithium2, dilithium3, dilithium5', 'dilithium3')
  .option('--network <network>', 'Target network: base or base-sepolia', 'base')
  .option('--out <path>', 'Output path for encrypted key file', './agent.key')
  .option('--metadata <path>', 'Path to JSON metadata file to anchor on-chain')
  .option('--rpc <url>', 'Custom RPC URL')
  .option('--deployer-key <key>', 'Deployer wallet private key (0x...) for paying gas. Reads CEVEX_DEPLOYER_KEY env if not set.')
  .option('--registry <address>', 'Override registry contract address')
  .action(async (opts) => {
    const entropy = opts.entropy as 'hardware-qrng' | 'software'
    const scheme = opts.scheme as SignatureScheme
    const network = opts.network as 'base' | 'base-sepolia'
    const outPath = opts.out as string

    // Resolve deployer key
    const deployerKey = (opts.deployerKey ?? process.env['CEVEX_DEPLOYER_KEY']) as `0x${string}` | undefined

    if (!deployerKey) {
      console.log('⚠  No deployer key provided. Agent will be provisioned locally (no on-chain registration).')
      console.log('   Set --deployer-key or CEVEX_DEPLOYER_KEY to register on Base.\n')
    }

    // Load metadata if provided
    let metadata: Record<string, unknown> | undefined
    if (opts.metadata) {
      if (!existsSync(opts.metadata)) {
        console.error(`Error: metadata file not found: ${opts.metadata}`)
        process.exit(1)
      }
      try {
        metadata = JSON.parse(readFileSync(opts.metadata, 'utf8'))
      } catch {
        console.error('Error: failed to parse metadata file as JSON')
        process.exit(1)
      }
    }

    console.log('Provisioning agent on Base...')
    console.log(`  Network:  ${network}`)
    console.log(`  Scheme:   ${scheme}`)
    console.log(`  Entropy:  ${entropy}\n`)

    process.stdout.write('Sampling entropy...          ')
    let agent: CevexAgent
    try {
      agent = await CevexAgent.provision({
        entropySource: entropy,
        scheme,
        network,
        metadata,
        rpcUrl: opts.rpc,
        deployerKey,
        registryAddress: opts.registry,
      })
      console.log('done')
    } catch (err) {
      console.log('FAILED')
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }

    if (deployerKey) {
      console.log('Registering on Base...       done')
    }

    console.log()
    console.log(`Agent address:  ${agent.address}`)

    // Prompt for passphrase
    const passphrase = await promptPassphrase()

    // Save key file
    const keyPair = agent.exportKeyPair()
    saveKeyFile(outPath, keyPair, agent.address, network, passphrase)

    console.log(`Key saved to:   ${outPath} (encrypted)\n`)

    if (deployerKey) {
      console.log('Agent is live. Verify with:')
      console.log(`  cevex info ${agent.address}`)
    } else {
      console.log('Agent provisioned locally. Run with --deployer-key to register on Base.')
    }
  })

async function promptPassphrase(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question('\nPassphrase to encrypt key file: ', (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}
