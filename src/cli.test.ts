import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { run } from './cli'

describe('cli', () => {
  it('denies a write whose filename violates kebab-case', () => {
    const { response } = setup('write-new-file.json')

    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('allows a write whose filename matches kebab-case', () => {
    const { response } = setup('write-kebab-case.json')

    expect(response.hookSpecificOutput.permissionDecision).toBe('allow')
  })
})

function setup(fixtureName: string) {
  const payload = readFileSync(
    `test/fixtures/claude-code/${fixtureName}`,
    'utf8',
  )
  const raw = run(payload)
  const response = JSON.parse(raw)
  return { response }
}
