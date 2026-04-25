#!/usr/bin/env node
import { readFileSync, readSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { vendors } from './registry.js'
import { run, type ConfigLoader } from './cli.js'
import { loadConfig } from './config.js'
import { parseArgs } from './parse-args.js'
import { readCapped } from './read-capped.js'

const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024

const PACKAGE_JSON = JSON.parse(
  readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'package.json',
    ),
    'utf8',
  ),
) as { version: string; description?: string; homepage?: string }

const VERSION = PACKAGE_JSON.version

const HELP = `conduct ${VERSION}
${PACKAGE_JSON.description ?? 'Process discipline for coding agents.'}

Usage:
  conduct --agent <vendor> < <hook-payload-json>

Reads a hook payload from stdin, dispatches it through the rules
configured in conduct.config.ts, and writes the vendor's response
format to stdout.

Vendors:
  ${Object.keys(vendors).join(', ')}

Options:
  --agent <vendor>  Required. The host coding agent.
  --version         Print the package version and exit.
  --help            Print this help and exit.

Repo: ${PACKAGE_JSON.homepage ?? 'https://github.com/nizos/conduct'}
`

export type MainResult = {
  stdout?: string
  stderr?: string
  exitCode: number
}

export async function main(args: {
  argv: readonly string[]
  stdin: string | (() => string)
  loadConfig?: ConfigLoader
}): Promise<MainResult> {
  const parsed = parseArgs(args.argv)
  if (parsed.kind === 'version') return { stdout: `${VERSION}\n`, exitCode: 0 }
  if (parsed.kind === 'help') return { stdout: HELP, exitCode: 0 }
  if (parsed.kind === 'error') {
    return { stderr: parsed.stderr, exitCode: parsed.exitCode }
  }

  let stdin: string
  try {
    stdin = typeof args.stdin === 'function' ? args.stdin() : args.stdin
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { stderr: `conduct: ${reason}\n`, exitCode: 1 }
  }

  const cliLoader: ConfigLoader | undefined =
    parsed.configPath !== undefined
      ? () => loadConfig(path.resolve(parsed.configPath as string))
      : undefined

  try {
    const response = await run(stdin, {
      vendor: parsed.vendor,
      loadConfig: args.loadConfig ?? cliLoader,
    })
    return { stdout: response, exitCode: 0 }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { stderr: `conduct: ${reason}\n`, exitCode: 1 }
  }
}

if (isInvokedAsScript()) {
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

// Resolve symlinks on argv[1] so the script-entry check works under npx /
// node_modules/.bin shims (which always invoke through a symlink).
function isInvokedAsScript(): boolean {
  const argv1 = process.argv[1]
  if (!argv1) return false
  try {
    const resolved = realpathSync(argv1)
    return import.meta.url === pathToFileURL(resolved).href
  } catch {
    return false
  }
}
