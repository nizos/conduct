import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { toAction, toResponse } from './github-copilot.js'

describe('github-copilot adapter', () => {
  it('tags the action type as command for a bash payload', () => {
    const { action } = setup('bash-npm-install.json')

    expect(action.type).toBe('command')
  })

  it('extracts the command text from a bash payload', () => {
    const { action, payload } = setup('bash-npm-install.json')
    const toolArgs = JSON.parse(payload.toolArgs) as { command: string }

    expect(action).toMatchObject({ command: toolArgs.command })
  })

  it('builds a deny response with permissionDecision and reason', () => {
    const response = JSON.parse(
      toResponse({ kind: 'block', reason: 'no failing test' }),
    )

    expect(response).toEqual({
      permissionDecision: 'deny',
      permissionDecisionReason: 'no failing test',
    })
  })

  it('builds an allow response with permissionDecision: allow', () => {
    const response = JSON.parse(toResponse({ kind: 'allow' }))

    expect(response).toEqual({ permissionDecision: 'allow' })
  })

  it('throws when toolArgs is missing or not a JSON-encoded string', () => {
    expect(() =>
      toAction({ toolName: 'bash', toolArgs: 'not-valid-json' }),
    ).toThrow(/toolArgs|command|payload/i)
  })
})

function setup(fixtureName: string) {
  const payload = JSON.parse(
    readFileSync(`test/fixtures/github-copilot/${fixtureName}`, 'utf8'),
  )
  const action = toAction(payload)
  return { action, payload }
}
