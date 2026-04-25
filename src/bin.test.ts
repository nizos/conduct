import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { main, type MainResult } from './bin.js'
import type { ConfigLoader } from './cli.js'
import type { Config } from './config.js'
import type { Agent } from './rule.js'
import { filenameCasing } from './rules/filename-casing.js'

describe('bin main', () => {
  it('returns exit code 2 and a helpful stderr when --agent is missing', async () => {
    const result = await setup({ argv: ['node', 'bin.js'] })

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toMatch(/--agent/)
    expect(result.stderr).toMatch(/missing/)
  })

  it('returns exit code 2 and lists known agents when --agent is unknown', async () => {
    const result = await setup({ argv: ['node', 'bin.js', '--agent', 'bogus'] })

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toMatch(/bogus/)
    expect(result.stderr).toMatch(/claude-code/)
  })

  it('returns exit 1 with a cap message when stdin reading throws', async () => {
    const result = await setup({
      stdin: () => {
        throw new Error('input exceeds 10 bytes')
      },
    })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/exceeds|cap|bytes/i)
  })

  it('prints usage with --help including the repo URL and exits 0', async () => {
    const result = await setup({ argv: ['node', 'bin.js', '--help'] })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/Usage:/)
    expect(result.stdout).toContain('github.com/nizos/conduct')
  })

  it('prints the package version to stdout and exits 0 with --version', async () => {
    const result = await setup({ argv: ['node', 'bin.js', '--version'] })

    expect(result.exitCode).toBe(0)
    expect(result.stdout?.trim()).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('honors --config <path> by loading that file instead of discovering one', async () => {
    const result = await setup({
      argv: [
        'node',
        'bin.js',
        '--agent',
        'claude-code',
        '--config',
        'test/fixtures/configs/kebab-only.config.ts',
      ],
      stdin: KEBAB_PAYLOAD,
    })

    expect(result.exitCode).toBe(0)
    expect(decisionOf(result)).toBe('allow')
  })

  it('forwards an injected config loader through to run()', async () => {
    const result = await setup({
      stdin: KEBAB_PAYLOAD,
      loadConfig: async () => testConfig,
    })

    expect(result.exitCode).toBe(0)
    expect(decisionOf(result)).toBe('allow')
  })

  it('writes the run() response to stdout and exits 0 on success', async () => {
    const result = await setup({
      stdin: KEBAB_PAYLOAD,
      loadConfig: async () => testConfig,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBeUndefined()
    expect(decisionOf(result)).toBe('allow')
  })
})

const stubAgent: Agent = {
  reason: async () => ({ verdict: 'pass', reason: '' }),
}

const testConfig: Config = {
  rules: [
    filenameCasing({
      style: 'kebab-case',
      paths: ['**/src/**', '**/test/**'],
    }),
  ],
  agent: stubAgent,
}

const KEBAB_PAYLOAD = readFileSync(
  'test/fixtures/claude-code/write-kebab-case.json',
  'utf8',
)

async function setup(
  opts: {
    argv?: readonly string[]
    stdin?: string | (() => string)
    loadConfig?: ConfigLoader
  } = {},
): Promise<MainResult> {
  return main({
    argv: opts.argv ?? ['node', 'bin.js', '--agent', 'claude-code'],
    stdin: opts.stdin ?? '',
    loadConfig: opts.loadConfig,
  })
}

function decisionOf(result: MainResult): string {
  return JSON.parse(result.stdout ?? '').hookSpecificOutput.permissionDecision
}
