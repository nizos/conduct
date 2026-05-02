import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import type { Action } from '../../types.js'
import { parseAs } from '../../utils/parse-as.js'
import type { ParseActionResult } from '../adapter.js'
import {
  parseAction,
  sessionPath,
  toResponse,
  type ResponseShape,
} from './adapter.js'

type Payload = {
  cwd?: string
  tool_name: string
  tool_input: {
    file_path?: string
    content?: string
    command?: string
    new_string?: string
  }
}

describe('claude-code adapter', () => {
  it('parseAction returns an ok result with the typed action for a valid payload', () => {
    const result = parseAction({
      cwd: '/workspaces/probity',
      tool_name: 'Write',
      tool_input: {
        file_path: '/workspaces/probity/src/UpperCase.ts',
        content: 'x',
      },
    })

    expect(result).toEqual({
      ok: true,
      action: {
        kind: 'write',
        path: '/workspaces/probity/src/UpperCase.ts',
        content: 'x',
      },
    })
  })

  it('extracts the file path from a Write payload as an absolute POSIX path', () => {
    const { action } = setup('write-new-file.json')

    expect(action).toMatchObject({
      path: '/workspaces/probity/src/userProfile.ts',
    })
  })

  it('tags the action type as write for a Write payload', () => {
    const { action } = setup('write-new-file.json')

    expect(action.kind).toBe('write')
  })

  it('extracts the content from a Write payload', () => {
    const { action, payload } = setup('write-new-file.json')

    expect(action).toMatchObject({ content: payload.tool_input.content })
  })

  it('tags the action type as command for a Bash payload', () => {
    const { action } = setup('bash-npm-install.json')

    expect(action.kind).toBe('command')
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

    expect(action).toMatchObject({ path: '/workspaces/probity/README.md' })
  })

  it('preserves an absolute file_path emitted by the agent', () => {
    const action = ok(
      parseAction({
        cwd: '/workspaces/probity',
        tool_name: 'Write',
        tool_input: {
          file_path: '/workspaces/probity/src/UpperCase.ts',
          content: 'x',
        },
      }),
    )

    expect(action).toMatchObject({
      kind: 'write',
      path: '/workspaces/probity/src/UpperCase.ts',
    })
  })

  it('fails closed when a Write payload omits cwd (vendors reliably emit it; absence is malformed)', () => {
    const result = parseAction({
      tool_name: 'Write',
      tool_input: {
        file_path: '/workspaces/probity/src/UpperCase.ts',
        content: 'x',
      },
    })

    expect(result.ok).toBe(false)
  })

  it('preserves an absolute file_path even when it sits outside cwd', () => {
    const action = ok(
      parseAction({
        cwd: '/workspaces/probity',
        tool_name: 'Write',
        tool_input: { file_path: '/etc/passwd', content: 'x' },
      }),
    )

    expect(action).toMatchObject({ kind: 'write', path: '/etc/passwd' })
  })

  it('returns no opinion (empty stdout) on an allow decision so normal permission flow takes over', () => {
    expect(toResponse({ kind: 'allow' })).toBe('')
  })

  it('builds a deny response from a block decision', () => {
    const response = parseAs<ResponseShape>(
      toResponse({ kind: 'block', reason: 'out of scope' }),
    )

    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('preserves the decision reason in a block response', () => {
    const response = parseAs<ResponseShape>(
      toResponse({ kind: 'block', reason: 'out of scope' }),
    )

    expect(response.hookSpecificOutput.permissionDecisionReason).toBe(
      'out of scope',
    )
  })

  it('rejects a Bash payload missing the command field', () => {
    const result = parseAction({ tool_name: 'Bash', tool_input: {} })

    expect(result.ok).toBe(false)
  })

  it('passes through an unsupported tool_name as a no-op so unknown tools are not blocked', () => {
    const action = ok(
      parseAction({
        tool_name: 'MultiEdit',
        tool_input: { file_path: 'x', edits: [] },
      }),
    )

    expect(action).toEqual({ kind: 'command', command: '' })
  })

  it('returns the transcript_path from the payload as the session path', () => {
    expect(sessionPath({ transcript_path: '/some/transcript.jsonl' })).toBe(
      '/some/transcript.jsonl',
    )
  })
})

function setup(fixtureName: string) {
  const payload = parseAs<Payload>(
    readFileSync(`test/fixtures/claude-code/${fixtureName}`, 'utf8'),
  )
  const action = ok(parseAction(payload))
  return { action, payload }
}

function ok(result: ParseActionResult): Action {
  if (!result.ok) throw new Error(`expected ok, got: ${result.reason}`)
  return result.action
}
