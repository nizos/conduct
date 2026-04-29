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

  it('wraps the deny response in hookSpecificOutput so Chat honors it (flat shape is silently ignored)', () => {
    const response = JSON.parse(
      toResponse({ kind: 'block', reason: 'no failing test' }),
    )

    expect(response).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'no failing test',
      },
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

  it('passes through read_file as a no-op so reads are not blocked by an unknown-tool error', () => {
    const payload = JSON.parse(
      readFileSync(
        'test/fixtures/github-copilot-chat/pre-read-file.json',
        'utf8',
      ),
    )

    expect(actionSchema.parse(payload)).toEqual({
      type: 'command',
      command: '',
    })
  })

  it('passes through list_dir as a no-op so listings are not blocked by an unknown-tool error', () => {
    const payload = JSON.parse(
      readFileSync(
        'test/fixtures/github-copilot-chat/pre-list-dir.json',
        'utf8',
      ),
    )

    expect(actionSchema.parse(payload)).toEqual({
      type: 'command',
      command: '',
    })
  })

  it('passes through any unknown tool_name (catchall, not a hardcoded list of read tools)', () => {
    expect(
      actionSchema.parse({
        tool_name: 'some_future_tool',
        tool_input: { whatever: true },
      }),
    ).toEqual({ type: 'command', command: '' })
  })
})

function setup(fixtureName: string) {
  const payload = JSON.parse(
    readFileSync(`test/fixtures/github-copilot-chat/${fixtureName}`, 'utf8'),
  )
  const action = actionSchema.parse(payload)
  return { action, payload }
}
