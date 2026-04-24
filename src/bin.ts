#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { adapters, isAgent } from './adapters/registry.js'
import { run } from './cli.js'

export type MainResult = {
  stdout?: string
  stderr?: string
  exitCode: number
}

export async function main(args: {
  argv: readonly string[]
  stdin: string
}): Promise<MainResult> {
  const agentIndex = args.argv.indexOf('--agent')
  if (agentIndex === -1) {
    return {
      stderr: 'conduct: --agent is missing\n',
      exitCode: 2,
    }
  }
  const agentArg = args.argv[agentIndex + 1]
  if (!isAgent(agentArg)) {
    const known = Object.keys(adapters).join(', ')
    return {
      stderr: `conduct: --agent ${String(agentArg)} is not a known agent. Expected one of: ${known}\n`,
      exitCode: 2,
    }
  }
  try {
    const response = await run(args.stdin, { agent: agentArg })
    return { stdout: response, exitCode: 0 }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return {
      stderr: `conduct: ${reason}\n`,
      exitCode: 1,
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const stdin = readFileSync(0, 'utf8')
  const result = await main({ argv: process.argv, stdin })
  if (result.stdout !== undefined) process.stdout.write(result.stdout)
  if (result.stderr !== undefined) process.stderr.write(result.stderr)
  process.exit(result.exitCode)
}
