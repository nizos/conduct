import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { toAction } from './codex'

describe('codex adapter', () => {
  it('tags the action type as command for a Bash payload', () => {
    const { action } = setup('bash-npm-install.json')

    expect(action.type).toBe('command')
  })

  it('extracts the command text from a Bash payload', () => {
    const { action, payload } = setup('bash-npm-install.json')

    expect(action).toMatchObject({ command: payload.tool_input.command })
  })
})

function setup(fixtureName: string) {
  const payload = JSON.parse(
    readFileSync(`test/fixtures/codex/${fixtureName}`, 'utf8'),
  )
  const action = toAction(payload)
  return { action, payload }
}
