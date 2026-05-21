import { Command } from 'commander'
import { createInterface } from 'readline'
import { existsSync } from 'fs'
import { CevexAgent } from '@cevex/agent'
import { loadKeyFile, saveKeyFile } from '../keyfile'

export const rotateCommand = new Command('rotate')
  .description("Rotate an agent's keypair")
  .requiredOption('--key <path>', 'Path to encrypted agent key file')
  .option('--entropy <source>', 'Entropy source for the new key: hardware-qrng or software', 'hardware-qrng')
  .option('--out <path>', 'Output path for new key file (defaults to overwriting the input file)')
  .option('--rpc <url>', 'Custom RPC URL')
  .option('--deployer-key <key>', 'Deployer wallet private key for paying gas')
  .option('--registry <address>', 'Override registry contract address')
  .action(async (opts) => {
    const keyPath = opts.key as string
    const outPath = (opts.out ?? keyPath) as string

    if (!existsSync(keyPath)) {
      console.error(`Error: key file not found: ${keyPath}`)
      process.exit(1)
    }

    const passphrase = await promptPassphrase('Current passphrase: ')
    let keyFileData: ReturnType<typeof loadKeyFile>
    try {
      keyFileData = loadKeyFile(keyPath, passphrase)
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }

    const deployerKey = (opts.deployerKey ?? process.env['CEVEX_DEPLOYER_KEY']) as `0x${string}` | undefined

    const agent = await CevexAgent.fromKeyPair(keyFileData.keyPair, {
      network: keyFileData.network,
      rpcUrl: opts.rpc,
      deployerKey,
      registryAddress: opts.registry,
    })

    console.log(`Rotating keypair for ${agent.address}...`)

    let rotationTxHash: string
    try {
      const result = await agent.rotateKey({ entropySource: opts.entropy as 'hardware-qrng' | 'software' })
      rotationTxHash = result.rotationTxHash
    } catch (err) {
      console.error(`Rotation failed: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }

    const newPassphrase = await promptPassphrase('New passphrase for rotated key file: ')

    const newKeyPair = agent.exportKeyPair()
    saveKeyFile(outPath, newKeyPair, agent.address, keyFileData.network, newPassphrase)

    console.log()
    console.log(`Tx hash:       ${rotationTxHash}`)
    console.log(`New key saved: ${outPath}`)
  })

async function promptPassphrase(prompt: string = 'Passphrase: '): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}
