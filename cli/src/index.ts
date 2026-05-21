#!/usr/bin/env node
/**
 * @cevex/cli
 *
 * Command-line interface for CEVEX agent provisioning and key management.
 *
 * Usage: cevex <command> [options]
 */

import { Command } from 'commander'
import { provisionCommand } from './commands/provision'
import { signCommand }      from './commands/sign'
import { verifyCommand }    from './commands/verify'
import { rotateCommand }    from './commands/rotate'
import { revokeCommand }    from './commands/revoke'
import { infoCommand }      from './commands/info'
import { batchVerifyCommand } from './commands/batch-verify'

const program = new Command()

program
  .name('cevex')
  .description('CEVEX — Post-quantum identity for autonomous AI agents on Base')
  .version('0.1.0')

program.addCommand(provisionCommand)
program.addCommand(signCommand)
program.addCommand(verifyCommand)
program.addCommand(rotateCommand)
program.addCommand(revokeCommand)
program.addCommand(infoCommand)
program.addCommand(batchVerifyCommand)

program.parse(process.argv)
