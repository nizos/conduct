import { readFileSync } from 'node:fs'

import type { PreToolUseHookOutput } from '@github/copilot/sdk'
import { describe, it, expect } from 'vitest'

import type { Action } from '../../types.js'
import { parseAs } from '../../utils/parse-as.js'
import type { ParseActionResult } from '../adapter.js'
import { parseAction, sessionPath, toResponse } from './adapter.js'

type Payload = {
  cwd?: string
  toolName: string
  toolArgs: string
}

describe('github-copilot adapter', () => {
  it('parseAction returns an ok result with the typed action for a valid payload', async () => {
    const result = await parseAction({
      cwd: '/workspaces/probity',
      toolName: 'create',
      toolArgs: JSON.stringify({
        path: '/workspaces/probity/src/UpperCase.ts',
        file_text: 'x',
      }),
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

  it('tags the action type as command for a bash payload', async () => {
    const { action } = await setup('pre-bash-npm-test.json')

    expect(action.kind).toBe('command')
  })

  it('extracts the command text from a bash payload', async () => {
    const { action, payload } = await setup('pre-bash-npm-test.json')
    const toolArgs = parseAs<{ command: string }>(payload.toolArgs)

    expect(action).toMatchObject({ command: toolArgs.command })
  })

  it('builds a deny response with permissionDecision and reason', () => {
    const response = parseAs<PreToolUseHookOutput>(
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

  it('rejects a payload whose toolArgs is not a JSON-encoded string', async () => {
    const result = await parseAction({
      toolName: 'bash',
      toolArgs: 'not-valid-json',
    })

    expect(result.ok).toBe(false)
  })

  it('tags a create payload as a write action', async () => {
    const { action } = await setup('pre-create-new-test.json')

    expect(action.kind).toBe('write')
  })

  it('maps create payload path (absolute POSIX) + file_text onto the write action', async () => {
    const { action, payload } = await setup('pre-create-new-test.json')
    const args = parseAs<{ path: string; file_text: string }>(payload.toolArgs)

    expect(action).toMatchObject({
      path: '/workspaces/probity/test/calculator.test.ts',
      content: args.file_text,
    })
  })

  it('maps an edit payload path (absolute POSIX) + new_str onto the write action', async () => {
    const { action, payload } = await setup('pre-edit-add-subtract.json')
    const args = parseAs<{ path: string; new_str: string }>(payload.toolArgs)

    expect(action).toMatchObject({
      path: '/workspaces/probity/test/calculator.test.ts',
      content: args.new_str,
    })
  })

  it('preserves an absolute create path emitted by the agent', async () => {
    const action = ok(
      await parseAction({
        cwd: '/workspaces/probity',
        toolName: 'create',
        toolArgs: JSON.stringify({
          path: '/workspaces/probity/src/UpperCase.ts',
          file_text: 'x',
        }),
      }),
    )

    expect(action).toMatchObject({
      kind: 'write',
      path: '/workspaces/probity/src/UpperCase.ts',
    })
  })

  it('fails closed when a create payload omits cwd (vendors reliably emit it; absence is malformed)', async () => {
    const result = await parseAction({
      toolName: 'create',
      toolArgs: JSON.stringify({
        path: '/workspaces/probity/src/UpperCase.ts',
        file_text: 'x',
      }),
    })

    expect(result.ok).toBe(false)
  })

  it('fails closed when an edit payload omits cwd (vendors reliably emit it; absence is malformed)', async () => {
    const result = await parseAction({
      toolName: 'edit',
      toolArgs: JSON.stringify({
        path: '/workspaces/probity/src/UpperCase.ts',
        new_str: 'x',
      }),
    })

    expect(result.ok).toBe(false)
  })

  it('passes through view as a no-op so reads are not blocked by an unknown-tool error', async () => {
    const payload = parseAs<Payload>(
      readFileSync(
        'test/fixtures/github-copilot/pre-view-calculator.json',
        'utf8',
      ),
    )

    expect(ok(await parseAction(payload))).toEqual({
      kind: 'command',
      command: '',
    })
  })

  it('passes through report_intent as a no-op so metadata tools are not blocked', async () => {
    const payload = parseAs<Payload>(
      readFileSync(
        'test/fixtures/github-copilot/pre-report-intent.json',
        'utf8',
      ),
    )

    expect(ok(await parseAction(payload))).toEqual({
      kind: 'command',
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

  it('passes through any unknown toolName (catchall, not a hardcoded list of read tools)', async () => {
    const action = ok(
      await parseAction({
        toolName: 'some_future_tool',
        toolArgs: JSON.stringify({ whatever: true }),
      }),
    )

    expect(action).toEqual({ kind: 'command', command: '' })
  })
})

async function setup(fixtureName: string) {
  const payload = parseAs<Payload>(
    readFileSync(`test/fixtures/github-copilot/${fixtureName}`, 'utf8'),
  )
  const action = ok(await parseAction(payload))
  return { action, payload }
}

function ok(result: ParseActionResult): Action {
  if (!result.ok) throw new Error(`expected ok, got: ${result.reason}`)
  return result.action
}
