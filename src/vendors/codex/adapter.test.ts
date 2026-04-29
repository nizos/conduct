import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { actionSchema, sessionPath, toResponse } from './adapter.js'

describe('codex adapter', () => {
  it('tags the action type as command for a Bash payload', () => {
    const { action } = setup('pre-bash-pwd.json')

    expect(action.type).toBe('command')
  })

  it('extracts the command text from a Bash payload', () => {
    const { action, payload } = setup('pre-bash-pwd.json')

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

  it('throws for a malformed apply_patch payload (missing command field)', () => {
    expect(() =>
      actionSchema.parse({
        tool_name: 'apply_patch',
        tool_input: { patch: 'diff' },
      }),
    ).toThrow()
  })

  it('throws when apply_patch command lacks an Add/Update/Delete File header', () => {
    expect(() =>
      actionSchema.parse({
        tool_name: 'apply_patch',
        tool_input: { command: 'just a string with no header' },
      }),
    ).toThrow()
  })

  it('maps an apply_patch payload to a write action with path + patch content', () => {
    const payload = JSON.parse(
      readFileSync('test/fixtures/codex/pre-apply-patch.json', 'utf8'),
    )

    const action = actionSchema.parse(payload)

    expect(action.type).toBe('write')
    if (action.type !== 'write') throw new Error('expected write')
    expect(action.path).toBe('/workspaces/conduct/src/calculator.ts')
    expect(action.content).toContain('*** Begin Patch')
    expect(action.content).toContain('*** Add File:')
  })

  it('passes through an unsupported tool_name as a no-op so unknown tools are not blocked', () => {
    expect(
      actionSchema.parse({
        tool_name: 'some_future_tool',
        tool_input: { whatever: true },
      }),
    ).toEqual({ type: 'command', command: '' })
  })

  it('returns the transcript_path from the payload as the session path', () => {
    expect(
      sessionPath({ transcript_path: '/some/codex-transcript.jsonl' }),
    ).toBe('/some/codex-transcript.jsonl')
  })

  it('exposes actionSchema that parses a payload to a typed Action', () => {
    const payload = JSON.parse(
      readFileSync('test/fixtures/codex/pre-bash-pwd.json', 'utf8'),
    )

    const action = actionSchema.parse(payload)

    expect(action.type).toBe('command')
  })
})

function setup(fixtureName: string) {
  const payload = JSON.parse(
    readFileSync(`test/fixtures/codex/${fixtureName}`, 'utf8'),
  )
  const action = actionSchema.parse(payload)
  return { action, payload }
}
