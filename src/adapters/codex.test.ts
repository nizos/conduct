import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { toAction, toResponse } from './codex.js'

describe('codex adapter', () => {
  it('tags the action type as command for a Bash payload', () => {
    const { action } = setup('bash-npm-install.json')

    expect(action.type).toBe('command')
  })

  it('extracts the command text from a Bash payload', () => {
    const { action, payload } = setup('bash-npm-install.json')

    expect(action).toMatchObject({ command: payload.tool_input.command })
  })

  it('builds a block response as {"decision":"block","reason":...}', () => {
    const response = JSON.parse(
      toResponse({ kind: 'block', reason: 'no failing test' }),
    )

    expect(response).toEqual({
      decision: 'block',
      reason: 'no failing test',
    })
  })

  it('builds an empty allow response (exit 0 + empty stdout = allow in Codex)', () => {
    expect(toResponse({ kind: 'allow' })).toBe('')
  })

  it('throws for a non-Bash tool_name (Codex only intercepts Bash today)', () => {
    expect(() =>
      toAction({
        tool_name: 'apply_patch',
        tool_input: { patch: 'diff' },
      }),
    ).toThrow(/apply_patch|unsupported|Bash/i)
  })
})

function setup(fixtureName: string) {
  const payload = JSON.parse(
    readFileSync(`test/fixtures/codex/${fixtureName}`, 'utf8'),
  )
  const action = toAction(payload)
  return { action, payload }
}
