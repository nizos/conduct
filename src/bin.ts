#!/usr/bin/env node
import { readSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { vendors, isVendor } from './registry.js'
import { run } from './cli.js'
import { readCapped } from './read-capped.js'

const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024

export type MainResult = {
  stdout?: string
  stderr?: string
  exitCode: number
}

export async function main(args: {
  argv: readonly string[]
  stdin: string | (() => string)
}): Promise<MainResult> {
  const agentIndex = args.argv.indexOf('--agent')
  if (agentIndex === -1) {
    return {
      stderr: 'conduct: --agent is missing\n',
      exitCode: 2,
    }
  }
  const agentArg = args.argv[agentIndex + 1]
  if (!isVendor(agentArg)) {
    const known = Object.keys(vendors).join(', ')
    return {
      stderr: `conduct: --agent ${String(agentArg)} is not a known agent. Expected one of: ${known}\n`,
      exitCode: 2,
    }
  }
  let stdin: string
  try {
    stdin = typeof args.stdin === 'function' ? args.stdin() : args.stdin
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return {
      stderr: `conduct: ${reason}\n`,
      exitCode: 1,
    }
  }
  try {
    const response = await run(stdin, { vendor: agentArg })
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
  const result = await main({
    argv: process.argv,
    stdin: () =>
      readCapped(
        (buffer, offset, length) => readSync(0, buffer, offset, length, null),
        MAX_PAYLOAD_BYTES,
      ),
  })
  if (result.stdout !== undefined) process.stdout.write(result.stdout)
  if (result.stderr !== undefined) process.stderr.write(result.stderr)
  process.exit(result.exitCode)
}
