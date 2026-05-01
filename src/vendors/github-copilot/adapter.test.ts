import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { actionSchema, sessionPath, toResponse } from './adapter.js'

describe('github-copilot adapter', () => {
  it('tags the action type as command for a bash payload', () => {
    const { action } = setup('pre-bash-npm-test.json')

    expect(action.type).toBe('command')
  })

  it('extracts the command text from a bash payload', () => {
    const { action, payload } = setup('pre-bash-npm-test.json')
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

  it('returns no opinion (empty stdout) on an allow decision so Copilot keeps its built-in confirmations', () => {
    expect(toResponse({ kind: 'allow' })).toBe('')
  })

  it('throws when toolArgs is missing or not a JSON-encoded string', () => {
    expect(() =>
      actionSchema.parse({ toolName: 'bash', toolArgs: 'not-valid-json' }),
    ).toThrow()
  })

  it('tags a create payload as a write action', () => {
    const { action } = setup('pre-create-new-test.json')

    expect(action.type).toBe('write')
  })

  it('maps create payload path (absolute POSIX) + file_text onto the write action', () => {
    const { action, payload } = setup('pre-create-new-test.json')
    const args = JSON.parse(payload.toolArgs) as {
      path: string
      file_text: string
    }

    expect(action).toMatchObject({
      path: '/workspaces/conduct/test/calculator.test.ts',
      content: args.file_text,
    })
  })

  it('maps an edit payload path (absolute POSIX) + new_str onto the write action', () => {
    const { action, payload } = setup('pre-edit-add-subtract.json')
    const args = JSON.parse(payload.toolArgs) as {
      path: string
      new_str: string
    }

    expect(action).toMatchObject({
      path: '/workspaces/conduct/test/calculator.test.ts',
      content: args.new_str,
    })
  })

  it('preserves an absolute create path emitted by the agent', () => {
    const action = actionSchema.parse({
      cwd: '/workspaces/conduct',
      toolName: 'create',
      toolArgs: JSON.stringify({
        path: '/workspaces/conduct/src/UpperCase.ts',
        file_text: 'x',
      }),
    })

    expect(action).toMatchObject({
      type: 'write',
      path: '/workspaces/conduct/src/UpperCase.ts',
    })
  })

  it('fails closed when a create payload omits cwd (vendors reliably emit it; absence is malformed)', () => {
    expect(() =>
      actionSchema.parse({
        toolName: 'create',
        toolArgs: JSON.stringify({
          path: '/workspaces/conduct/src/UpperCase.ts',
          file_text: 'x',
        }),
      }),
    ).toThrow()
  })

  it('fails closed when an edit payload omits cwd (vendors reliably emit it; absence is malformed)', () => {
    expect(() =>
      actionSchema.parse({
        toolName: 'edit',
        toolArgs: JSON.stringify({
          path: '/workspaces/conduct/src/UpperCase.ts',
          new_str: 'x',
        }),
      }),
    ).toThrow()
  })

  it('passes through view as a no-op so reads are not blocked by an unknown-tool error', () => {
    const payload = JSON.parse(
      readFileSync(
        'test/fixtures/github-copilot/pre-view-calculator.json',
        'utf8',
      ),
    )

    expect(actionSchema.parse(payload)).toEqual({
      type: 'command',
      command: '',
    })
  })

  it('passes through report_intent as a no-op so metadata tools are not blocked', () => {
    const payload = JSON.parse(
      readFileSync(
        'test/fixtures/github-copilot/pre-report-intent.json',
        'utf8',
      ),
    )

    expect(actionSchema.parse(payload)).toEqual({
      type: 'command',
      command: '',
    })
  })

  it('builds the session path under COPILOT_HOME for a valid sessionId', () => {
    const prevHome = process.env.COPILOT_HOME
    process.env.COPILOT_HOME = '/tmp/fake-copilot-home'
    try {
      expect(sessionPath({ sessionId: 'abc-123' })).toBe(
        '/tmp/fake-copilot-home/session-state/abc-123/events.jsonl',
      )
    } finally {
      if (prevHome === undefined) delete process.env.COPILOT_HOME
      else process.env.COPILOT_HOME = prevHome
    }
  })

  it('returns undefined when sessionId contains path separators', () => {
    expect(sessionPath({ sessionId: '../../../etc' })).toBeUndefined()
  })

  it('passes through any unknown toolName (catchall, not a hardcoded list of read tools)', () => {
    expect(
      actionSchema.parse({
        toolName: 'some_future_tool',
        toolArgs: JSON.stringify({ whatever: true }),
      }),
    ).toEqual({ type: 'command', command: '' })
  })

  it('exposes actionSchema that parses a payload to a typed Action', () => {
    const payload = JSON.parse(
      readFileSync(
        'test/fixtures/github-copilot/pre-bash-npm-test.json',
        'utf8',
      ),
    )

    const action = actionSchema.parse(payload)

    expect(action.type).toBe('command')
  })
})

function setup(fixtureName: string) {
  const payload = JSON.parse(
    readFileSync(`test/fixtures/github-copilot/${fixtureName}`, 'utf8'),
  )
  const action = actionSchema.parse(payload)
  return { action, payload }
}
