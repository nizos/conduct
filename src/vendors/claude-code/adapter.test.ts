import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { buildContext, toAction, toResponse } from './adapter.js'

describe('claude-code adapter', () => {
  it('extracts the file path from a Write payload', () => {
    const { action, payload } = setup('write-new-file.json')

    expect(action).toMatchObject({ path: payload.tool_input.file_path })
  })

  it('tags the action type as write for a Write payload', () => {
    const { action } = setup('write-new-file.json')

    expect(action.type).toBe('write')
  })

  it('extracts the content from a Write payload', () => {
    const { action, payload } = setup('write-new-file.json')

    expect(action).toMatchObject({ content: payload.tool_input.content })
  })

  it('tags the action type as command for a Bash payload', () => {
    const { action } = setup('bash-npm-install.json')

    expect(action.type).toBe('command')
  })

  it('extracts the command text from a Bash payload', () => {
    const { action, payload } = setup('bash-npm-install.json')

    expect(action).toMatchObject({ command: payload.tool_input.command })
  })

  it('maps the Edit new_string to the content on the action', () => {
    const { action, payload } = setup('edit-file.json')

    expect(action).toMatchObject({ content: payload.tool_input.new_string })
  })

  it('extracts the file path from an Edit payload', () => {
    const { action, payload } = setup('edit-file.json')

    expect(action).toMatchObject({ path: payload.tool_input.file_path })
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

  it('throws when a Bash payload is missing the command field', () => {
    expect(() => toAction({ tool_name: 'Bash', tool_input: {} })).toThrow(
      /Bash|tool_input|command/i,
    )
  })

  it('throws for an unsupported tool_name so dispatch can reject the payload', () => {
    expect(() =>
      toAction({
        tool_name: 'MultiEdit',
        tool_input: { file_path: 'x', edits: [] },
      }),
    ).toThrow(/MultiEdit|unsupported|unknown/i)
  })

  it('builds a context whose history reads from the payload transcript_path', async () => {
    const ctx = buildContext({
      transcript_path: 'test/fixtures/transcripts/basic.jsonl',
    })

    const events = await ctx.history()

    expect(events).toContainEqual({ kind: 'prompt', text: 'add a test' })
  })
})

function setup(fixtureName: string) {
  const payload = JSON.parse(
    readFileSync(`test/fixtures/claude-code/${fixtureName}`, 'utf8'),
  )
  const action = toAction(payload)
  return { action, payload }
}
