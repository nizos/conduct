#!/usr/bin/env node
import { readFileSync, readSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { vendors } from './registry.js'
import { run, type ConfigLoader } from './cli.js'
import { loadConfig } from './config.js'
import { parseArgs } from './utils/parse-args.js'
import { readCapped } from './utils/read-capped.js'

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

const HELP = `probity ${VERSION}
${PACKAGE_JSON.description ?? 'Process discipline for coding agents.'}

Usage:
  probity --agent <vendor> < <hook-payload-json>

Reads a hook payload from stdin, dispatches it through the rules
configured in probity.config.ts, and writes the vendor's response
format to stdout.

Vendors:
  ${Object.keys(vendors).join(', ')}

Options:
  --agent <vendor>  Required. The host coding agent.
  --config <path>   Load rules from <path> instead of auto-discovering
                    probity.config.ts.
  --version         Print the package version and exit.
  --help            Print this help and exit.

Repo: ${PACKAGE_JSON.homepage ?? 'https://github.com/nizos/probity'}
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

  // Fail-closed: any failure in the run path (stdin read, config load,
  // dispatch) becomes a vendor-shaped block response on stdout. A
  // non-zero exit gets treated as advisory by most coding agents and
  // would silently let the action through; emitting a real block is
  // what the policy engine is for. The error message goes to stderr
  // as well so it surfaces in agent logs for debugging.
  const entry = vendors[parsed.vendor]
  try {
    const stdin = typeof args.stdin === 'function' ? args.stdin() : args.stdin
    const loadConfigOverride =
      args.loadConfig ?? loaderFromPath(parsed.configPath)
    const response = await run(stdin, {
      vendor: parsed.vendor,
      ...(loadConfigOverride && { loadConfig: loadConfigOverride }),
    })
    return { stdout: response, exitCode: 0 }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    const block = entry.adapter.toResponse({
      kind: 'block',
      reason: `probity: ${reason}`,
    })
    return {
      stdout: block,
      stderr: `probity: ${reason}\n`,
      exitCode: 0,
    }
  }
}

function loaderFromPath(
  configPath: string | undefined,
): ConfigLoader | undefined {
  return configPath !== undefined
    ? () => loadConfig(path.resolve(configPath))
    : undefined
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
// node_modules/.bin shims (which always invoke through a symlink). Do
// NOT simplify to the standard `import.meta.url === pathToFileURL(argv[1])`
// idiom — under npm/npx, argv[1] is the shim path while import.meta.url
// is the real `dist/bin.js`, so the comparison fails and `main()` never
// runs. Node 22 hasn't fixed this.
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
