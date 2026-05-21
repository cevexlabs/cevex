import solc from 'solc'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { installErrorHandler, panel } from './lib/ui.mjs'

installErrorHandler()

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptsDir, '..')
const buildDir = join(root, 'build')
const artifactPath = join(buildDir, 'CevexRegistry.json')

const input = {
  language: 'Solidity',
  sources: {
    'CevexRegistry.sol': {
      content: readFileSync(join(root, 'CevexRegistry.sol'), 'utf8'),
    },
    'interfaces/ICevexRegistry.sol': {
      content: readFileSync(join(root, 'interfaces', 'ICevexRegistry.sol'), 'utf8'),
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': [
          'abi',
          'evm.bytecode.object',
          'evm.deployedBytecode.object',
        ],
      },
    },
  },
}

const output = JSON.parse(solc.compile(JSON.stringify(input)))
const errors = output.errors ?? []
const failures = errors.filter(error => error.severity === 'error')

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure.formattedMessage ?? failure.message)
  }
  process.exit(1)
}

const compiled = output.contracts['CevexRegistry.sol'].CevexRegistry
const bytecode = `0x${compiled.evm.bytecode.object}`
const deployedBytecode = `0x${compiled.evm.deployedBytecode.object}`

mkdirSync(buildDir, { recursive: true })
writeFileSync(artifactPath, JSON.stringify({
  contractName: 'CevexRegistry',
  compilerVersion: solc.version(),
  abi: compiled.abi,
  bytecode,
  deployedBytecode,
}, null, 2) + '\n')

panel('COMPILE OK', [
  { label: 'Contract', value: 'CevexRegistry', status: true },
  { label: 'Compiler', value: solc.version() },
  { label: 'Bytecode', value: `${Math.floor((bytecode.length - 2) / 2)} bytes` },
  { label: 'Artifact', value: 'build/CevexRegistry.json' },
])
