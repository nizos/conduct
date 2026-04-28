import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { actionSchema, sessionPath, toResponse } from './adapter.js'

describe('github-copilot-chat adapter', () => {
  it('returns the transcript_path from the payload as the session path', () => {
    expect(
      sessionPath({ transcript_path: '/some/chat-transcript.jsonl' }),
    ).toBe('/some/chat-transcript.jsonl')
  })

  it('returns undefined for a malformed payload rather than throwing', () => {
    expect(sessionPath(null)).toBeUndefined()
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

  it('returns no opinion (empty stdout) on an allow decision so Chat keeps its built-in confirmations', () => {
    expect(toResponse({ kind: 'allow' })).toBe('')
  })

  it('tags the action type as command for a run_in_terminal payload', () => {
    const { action } = setup('pre-run-in-terminal.json')

    expect(action.type).toBe('command')
  })

  it('extracts the command text from a run_in_terminal payload', () => {
    const { action, payload } = setup('pre-run-in-terminal.json')

    expect(action).toMatchObject({ command: payload.tool_input.command })
  })

  it('tags a create_file payload as a write action', () => {
    const { action } = setup('pre-create-file.json')

    expect(action.type).toBe('write')
  })

  it('maps create_file payload filePath + content onto the write action', () => {
    const { action, payload } = setup('pre-create-file.json')

    expect(action).toMatchObject({
      path: payload.tool_input.filePath,
      content: payload.tool_input.content,
    })
  })

  it('tags a replace_string_in_file payload as a write action', () => {
    const { action } = setup('pre-replace-string-in-file.json')

    expect(action.type).toBe('write')
  })

  it('maps replace_string_in_file payload filePath + newString onto the write action', () => {
    const { action, payload } = setup('pre-replace-string-in-file.json')

    expect(action).toMatchObject({
      path: payload.tool_input.filePath,
      content: payload.tool_input.newString,
    })
  })

  it('throws for read_file (a pass-through tool with no rule applicability)', () => {
    const payload = JSON.parse(
      readFileSync(
        'test/fixtures/github-copilot-chat/pre-read-file.json',
        'utf8',
      ),
    )

    expect(() => actionSchema.parse(payload)).toThrow()
  })

  it('throws for list_dir (a pass-through tool with no rule applicability)', () => {
    const payload = JSON.parse(
      readFileSync(
        'test/fixtures/github-copilot-chat/pre-list-dir.json',
        'utf8',
      ),
    )

    expect(() => actionSchema.parse(payload)).toThrow()
  })
})

function setup(fixtureName: string) {
  const payload = JSON.parse(
    readFileSync(`test/fixtures/github-copilot-chat/${fixtureName}`, 'utf8'),
  )
  const action = actionSchema.parse(payload)
  return { action, payload }
}
