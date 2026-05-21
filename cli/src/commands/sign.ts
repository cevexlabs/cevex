import { Command } from 'commander'
import { createInterface } from 'readline'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { CevexAgent } from '@cevex/agent'
import { loadKeyFile } from '../keyfile'

export const signCommand = new Command('sign')
  .description('Sign a message with an existing agent')
  .requiredOption('--key <path>', 'Path to encrypted agent key file')
  .requiredOption('--message <value>', 'JSON string or path to JSON file')
  .option('--out <path>', 'Output path for signed message JSON (default: stdout)')
  .option('--rpc <url>', 'Custom RPC URL')
  .action(async (opts) => {
    const keyPath = opts.key as string
    const outPath = opts.out as string | undefined

    // Load key file
    if (!existsSync(keyPath)) {
      console.error(`Error: key file not found: ${keyPath}`)
      process.exit(1)
    }

    const passphrase = await promptPassphrase()
    let keyFileData: ReturnType<typeof loadKeyFile>
    try {
      keyFileData = loadKeyFile(keyPath, passphrase)
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }

    // Parse message
    const msgArg = opts.message as string
    let action: Record<string, unknown> | string

    if (existsSync(msgArg)) {
      try {
        action = JSON.parse(readFileSync(msgArg, 'utf8'))
      } catch {
        console.error(`Error: failed to parse message file as JSON: ${msgArg}`)
        process.exit(1)
      }
    } else {
      try {
        action = JSON.parse(msgArg)
      } catch {
        // Treat as plain string if not valid JSON
        action = msgArg
      }
    }

    // Restore agent
    const agent = await CevexAgent.fromKeyPair(keyFileData.keyPair, {
      network: keyFileData.network,
      rpcUrl: opts.rpc,
    })

    // Sign
    const signed = await agent.sign({ action })

    // Serialize signed message
    const output = {
      version: signed.version,
      agentAddress: signed.agentAddress,
      nonce: signed.nonce.toString(),
      timestamp: signed.timestamp,
      action: Buffer.from(signed.action).toString('hex'),
      signature: {
        scheme: signed.signature.scheme,
        bytes: Buffer.from(signed.signature.bytes).toString('hex'),
      },
    }

    const json = JSON.stringify(output, null, 2)

    if (outPath) {
      writeFileSync(outPath, json, 'utf8')
      console.log(`Signed message saved to: ${outPath}`)
    } else {
      console.log(json)
    }
  })

async function promptPassphrase(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question('Passphrase: ', (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}
