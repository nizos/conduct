import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { actionSchema, sessionPath, toResponse } from './adapter.js'

describe('claude-code adapter', () => {
  it('extracts the file path from a Write payload as an absolute POSIX path', () => {
    const { action } = setup('write-new-file.json')

    expect(action).toMatchObject({
      path: '/workspaces/conduct/src/userProfile.ts',
    })
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

  it('extracts the file path from an Edit payload as an absolute POSIX path', () => {
    const { action } = setup('edit-file.json')

    expect(action).toMatchObject({ path: '/workspaces/conduct/README.md' })
  })

  it('preserves an absolute file_path emitted by the agent', () => {
    const action = actionSchema.parse({
      cwd: '/workspaces/conduct',
      tool_name: 'Write',
      tool_input: {
        file_path: '/workspaces/conduct/src/UpperCase.ts',
        content: 'x',
      },
    })

    expect(action).toMatchObject({
      type: 'write',
      path: '/workspaces/conduct/src/UpperCase.ts',
    })
  })

  it('fails closed when a Write payload omits cwd (vendors reliably emit it; absence is malformed)', () => {
    expect(() =>
      actionSchema.parse({
        tool_name: 'Write',
        tool_input: {
          file_path: '/workspaces/conduct/src/UpperCase.ts',
          content: 'x',
        },
      }),
    ).toThrow()
  })

  it('preserves an absolute file_path even when it sits outside cwd', () => {
    const action = actionSchema.parse({
      cwd: '/workspaces/conduct',
      tool_name: 'Write',
      tool_input: { file_path: '/etc/passwd', content: 'x' },
    })

    expect(action).toMatchObject({ type: 'write', path: '/etc/passwd' })
  })

  it('returns no opinion (empty stdout) on an allow decision so normal permission flow takes over', () => {
    expect(toResponse({ kind: 'allow' })).toBe('')
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
    expect(() =>
      actionSchema.parse({ tool_name: 'Bash', tool_input: {} }),
    ).toThrow()
  })

  it('passes through an unsupported tool_name as a no-op so unknown tools are not blocked', () => {
    expect(
      actionSchema.parse({
        tool_name: 'MultiEdit',
        tool_input: { file_path: 'x', edits: [] },
      }),
    ).toEqual({ type: 'command', command: '' })
  })

  it('returns the transcript_path from the payload as the session path', () => {
    expect(sessionPath({ transcript_path: '/some/transcript.jsonl' })).toBe(
      '/some/transcript.jsonl',
    )
  })

  it('exposes actionSchema that parses a payload to a typed Action', () => {
    const payload = JSON.parse(
      readFileSync('test/fixtures/claude-code/bash-npm-install.json', 'utf8'),
    )

    const action = actionSchema.parse(payload)

    expect(action.type).toBe('command')
  })
})

function setup(fixtureName: string) {
  const payload = JSON.parse(
    readFileSync(`test/fixtures/claude-code/${fixtureName}`, 'utf8'),
  )
  const action = actionSchema.parse(payload)
  return { action, payload }
}
