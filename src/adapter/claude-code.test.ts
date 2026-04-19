import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { toAction, toResponse } from './claude-code'

describe('claude-code adapter', () => {
  it('extracts the file path from a Write payload', () => {
    const { action, payload } = setup('write-new-file.json')

    expect(action.path).toBe(payload.tool_input.file_path)
  })

  it('tags the action type as write for a Write payload', () => {
    const { action } = setup('write-new-file.json')

    expect(action.type).toBe('write')
  })

  it('builds an allow response from an allow decision', () => {
    const response = JSON.parse(toResponse({ kind: 'allow' }))

    expect(response.hookSpecificOutput.permissionDecision).toBe('allow')
  })

  it('builds a deny response from a block decision', () => {
    const response = JSON.parse(
      toResponse({ kind: 'block', reason: 'out of scope' }),
    )

    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('preserves the decision reason in a block response', () => {
    const response = JSON.parse(
      toResponse({ kind: 'block', reason: 'out of scope' }),
    )

    expect(response.hookSpecificOutput.permissionDecisionReason).toBe(
      'out of scope',
    )
  })
})

function setup(fixtureName: string) {
  const payload = JSON.parse(
    readFileSync(`test/fixtures/claude-code/${fixtureName}`, 'utf8'),
  )
  const action = toAction(payload)
  return { action, payload }
}
