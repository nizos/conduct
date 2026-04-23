import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { run } from './cli'

describe('cli', () => {
  it('denies a write whose filename violates kebab-case', async () => {
    const { response } = await setup('write-new-file.json')

    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('allows a write whose filename matches kebab-case', async () => {
    const { response } = await setup('write-kebab-case.json')

    expect(response.hookSpecificOutput.permissionDecision).toBe('allow')
  })

  it('throws for codex until response translation is implemented', async () => {
    const payload = readFileSync(
      'test/fixtures/codex/bash-npm-install.json',
      'utf8',
    )

    await expect(run(payload, { agent: 'codex' })).rejects.toThrow(
      /codex.*toResponse/i,
    )
  })

  it('throws for github-copilot until response translation is implemented', async () => {
    const payload = readFileSync(
      'test/fixtures/github-copilot/bash-npm-install.json',
      'utf8',
    )

    await expect(run(payload, { agent: 'github-copilot' })).rejects.toThrow(
      /github-copilot.*toResponse/i,
    )
  })
})

async function setup(fixtureName: string) {
  const payload = readFileSync(
    `test/fixtures/claude-code/${fixtureName}`,
    'utf8',
  )
  const raw = await run(payload, { agent: 'claude-code' })
  const response = JSON.parse(raw)
  return { response }
}
