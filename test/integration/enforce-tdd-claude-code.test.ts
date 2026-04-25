import { beforeAll, describe, it, expect } from 'vitest'

import { vendors } from '../../src/adapters/registry.js'
import { dispatch } from '../../src/cli.js'
import type { Agent } from '../../src/rule.js'
import { enforceTdd } from '../../src/rules/enforce-tdd.js'

const runAi = process.env.CONDUCT_INTEGRATION_AI === '1'
const entry = vendors['claude-code']

describe.skipIf(!runAi)('enforce-tdd (integration with real AI)', () => {
  let agent: Agent
  beforeAll(() => {
    agent = entry.agent()
  })

  const claudeCode = entry.adapter
  it('allows clean TDD with minimal implementation', async () => {
    const payload = buildWritePayload({
      transcript: 'test/fixtures/transcripts/tdd-clean.jsonl',
      file_path: '/workspaces/conduct/src/add.ts',
      content: 'export const add = (a: number, b: number): number => a + b\n',
    })

    const response = await dispatch(claudeCode, payload, [enforceTdd()], agent)
    const parsed = JSON.parse(response)

    expect(parsed.hookSpecificOutput.permissionDecision).toBe('allow')
  }, 60000)

  it('blocks clear over-implementation', async () => {
    const payload = buildWritePayload({
      transcript: 'test/fixtures/transcripts/tdd-over-impl.jsonl',
      file_path: '/workspaces/conduct/src/add.ts',
      content: OVER_IMPL,
    })

    const response = await dispatch(claudeCode, payload, [enforceTdd()], agent)
    const parsed = JSON.parse(response)

    expect(parsed.hookSpecificOutput.permissionDecision).toBe('deny')
  }, 60000)

  it('blocks implementation when the failing test has not been run', async () => {
    const payload = buildWritePayload({
      transcript: 'test/fixtures/transcripts/tdd-no-test-run.jsonl',
      file_path: '/workspaces/conduct/src/add.ts',
      content: 'export const add = (a: number, b: number): number => a + b\n',
    })

    const response = await dispatch(claudeCode, payload, [enforceTdd()], agent)
    const parsed = JSON.parse(response)

    expect(parsed.hookSpecificOutput.permissionDecision).toBe('deny')
  }, 60000)
})

const OVER_IMPL = `export const add = (a: number, b: number): number => a + b
export const subtract = (a: number, b: number): number => a - b
export const multiply = (a: number, b: number): number => a * b
export const divide = (a: number, b: number): number => {
  if (b === 0) throw new Error('division by zero')
  return a / b
}
export const power = (a: number, b: number): number => Math.pow(a, b)
export const sqrt = (a: number): number => Math.sqrt(a)

export class Calculator {
  private history: Array<{ op: string; result: number }> = []

  add(a: number, b: number): number {
    const r = a + b
    this.history.push({ op: 'add', result: r })
    return r
  }
  subtract(a: number, b: number): number {
    const r = a - b
    this.history.push({ op: 'subtract', result: r })
    return r
  }
  clear(): void {
    this.history = []
  }
}
`

function buildWritePayload(opts: {
  transcript: string
  file_path: string
  content: string
}): string {
  return JSON.stringify({
    session_id: 'integration',
    transcript_path: opts.transcript,
    cwd: '/workspaces/conduct',
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: { file_path: opts.file_path, content: opts.content },
    tool_use_id: 'toolu_integration',
  })
}
