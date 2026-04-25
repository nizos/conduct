import { isVendor, vendors, type Vendor } from './registry.js'

export type ParsedArgs =
  | { kind: 'version' }
  | { kind: 'help' }
  | { kind: 'error'; stderr: string; exitCode: number }
  | { kind: 'run'; vendor: Vendor; configPath: string | undefined }

export function parseArgs(argv: readonly string[]): ParsedArgs {
  if (argv.includes('--version')) return { kind: 'version' }
  if (argv.includes('--help')) return { kind: 'help' }
  const agentIdx = argv.indexOf('--agent')
  if (agentIdx === -1) {
    return {
      kind: 'error',
      stderr: 'conduct: --agent is missing\n',
      exitCode: 2,
    }
  }
  const agentArg = argv[agentIdx + 1]
  if (!isVendor(agentArg)) {
    const known = Object.keys(vendors).join(', ')
    return {
      kind: 'error',
      stderr: `conduct: --agent ${String(agentArg)} is not a known agent. Expected one of: ${known}\n`,
      exitCode: 2,
    }
  }
  const configIdx = argv.indexOf('--config')
  const configPath = configIdx !== -1 ? argv[configIdx + 1] : undefined
  return { kind: 'run', vendor: agentArg, configPath }
}
