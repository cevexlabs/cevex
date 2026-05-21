import { Command } from 'commander'
import { RegistryClient } from '@cevex/registry'

const SCHEME_NAMES: Record<number, string> = {
  0: 'dilithium',
  1: 'falcon',
}

const LEVEL_NAMES: Record<number, string> = {
  2: '2 (128-bit PQ)',
  3: '3 (162-bit PQ)',
  5: '5 (256-bit PQ)',
}

export const infoCommand = new Command('info')
  .description('Look up an agent identity on-chain')
  .argument('<address>', 'Agent address to look up')
  .option('--network <network>', 'Network: base or base-sepolia', 'base')
  .option('--rpc <url>', 'Custom RPC URL')
  .option('--registry <address>', 'Override registry contract address')
  .action(async (address: string, opts) => {
    const registry = new RegistryClient({
      network: opts.network as 'base' | 'base-sepolia',
      rpcUrl: opts.rpc,
      registryAddress: opts.registry,
    })

    console.log(`Agent: ${address}\n`)

    let identity: Awaited<ReturnType<typeof registry.getIdentity>>
    try {
      identity = await registry.getIdentity(address)
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }

    if (!identity) {
      console.log('  Status: NOT REGISTERED')
      process.exit(1)
    }

    const schemeName = SCHEME_NAMES[identity.scheme] ?? `scheme(${identity.scheme})`
    const levelName = LEVEL_NAMES[identity.securityLevel] ?? String(identity.securityLevel)
    const isRevoked = identity.revokedAt > 0n
    const statusColor = isRevoked ? '\x1b[31m' : '\x1b[32m'
    const statusReset = '\x1b[0m'
    const statusText = isRevoked ? 'REVOKED' : 'ACTIVE'

    const registeredDate = new Date(Number(identity.registeredAt) * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'

    console.log(`  Scheme:         ${schemeName}`)
    console.log(`  Security level: ${levelName}`)
    console.log(`  Status:         ${statusColor}${statusText}${statusReset}`)
    console.log(`  Registered:     ${registeredDate}`)

    if (isRevoked) {
      const revokedDate = new Date(Number(identity.revokedAt) * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
      console.log(`  Revoked:        ${revokedDate}`)
    }

    if (identity.metadataHash && identity.metadataHash !== '0x' + '00'.repeat(32)) {
      console.log(`  Metadata:       ${identity.metadataHash}`)
    }
  })
