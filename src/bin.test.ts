import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { main } from './bin.js'

describe('bin main', () => {
  it('returns exit code 2 and a helpful stderr when --agent is missing', async () => {
    const result = await main({ argv: ['node', 'bin.js'], stdin: '' })

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toMatch(/--agent/)
    expect(result.stderr).toMatch(/missing/)
  })

  it('returns exit code 2 and lists known agents when --agent is unknown', async () => {
    const result = await main({
      argv: ['node', 'bin.js', '--agent', 'bogus'],
      stdin: '',
    })

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toMatch(/bogus/)
    expect(result.stderr).toMatch(/claude-code/)
  })

  it('returns exit 1 with a cap message when stdin reading throws', async () => {
    const result = await main({
      argv: ['node', 'bin.js', '--agent', 'claude-code'],
      stdin: () => {
        throw new Error('input exceeds 10 bytes')
      },
    })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/exceeds|cap|bytes/i)
  })

  it('prints usage with --help including the repo URL and exits 0', async () => {
    const result = await main({
      argv: ['node', 'bin.js', '--help'],
      stdin: '',
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/Usage:/)
    expect(result.stdout).toContain('github.com/nizos/conduct')
  })

  it('prints the package version to stdout and exits 0 with --version', async () => {
    const result = await main({
      argv: ['node', 'bin.js', '--version'],
      stdin: '',
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout?.trim()).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('writes the run() response to stdout and exits 0 on success', async () => {
    const payload = readFileSync(
      'test/fixtures/claude-code/write-kebab-case.json',
      'utf8',
    )

    const result = await main({
      argv: ['node', 'bin.js', '--agent', 'claude-code'],
      stdin: payload,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBeUndefined()
    expect(
      JSON.parse(result.stdout ?? '').hookSpecificOutput.permissionDecision,
    ).toBe('allow')
  })
})
