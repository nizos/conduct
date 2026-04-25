import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { sessionPath, toAction, toResponse } from './adapter.js'

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

  it('builds an allow response with permissionDecision: allow', () => {
    const response = JSON.parse(toResponse({ kind: 'allow' }))

    expect(response).toEqual({ permissionDecision: 'allow' })
  })

  it('throws when toolArgs is missing or not a JSON-encoded string', () => {
    expect(() =>
      toAction({ toolName: 'bash', toolArgs: 'not-valid-json' }),
    ).toThrow(/toolArgs|command|payload/i)
  })

  it('tags a create payload as a write action', () => {
    const { action } = setup('pre-create-new-test.json')

    expect(action.type).toBe('write')
  })

  it('maps create payload path + file_text onto the write action', () => {
    const { action, payload } = setup('pre-create-new-test.json')
    const args = JSON.parse(payload.toolArgs) as {
      path: string
      file_text: string
    }

    expect(action).toMatchObject({ path: args.path, content: args.file_text })
  })

  it('maps an edit payload path + new_str onto the write action', () => {
    const { action, payload } = setup('pre-edit-add-subtract.json')
    const args = JSON.parse(payload.toolArgs) as {
      path: string
      new_str: string
    }

    expect(action).toMatchObject({ path: args.path, content: args.new_str })
  })

  it('throws for non-write / non-command tools like view', () => {
    const payload = JSON.parse(
      readFileSync(
        'test/fixtures/github-copilot/pre-view-calculator.json',
        'utf8',
      ),
    )

    expect(() => toAction(payload)).toThrow(/view|unsupported|toolName/i)
  })

  it('throws for metadata tools like report_intent', () => {
    const payload = JSON.parse(
      readFileSync(
        'test/fixtures/github-copilot/pre-report-intent.json',
        'utf8',
      ),
    )

    expect(() => toAction(payload)).toThrow(
      /report_intent|unsupported|toolName/i,
    )
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
})

function setup(fixtureName: string) {
  const payload = JSON.parse(
    readFileSync(`test/fixtures/github-copilot/${fixtureName}`, 'utf8'),
  )
  const action = toAction(payload)
  return { action, payload }
}
