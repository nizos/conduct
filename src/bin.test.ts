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

  it('surfaces a run() throw as exit 1 with the message on stderr', async () => {
    const result = await main({
      argv: ['node', 'bin.js', '--agent', 'codex'],
      stdin: readFileSync('test/fixtures/codex/bash-npm-install.json', 'utf8'),
    })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(/codex.*toResponse/i)
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
