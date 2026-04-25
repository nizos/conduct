import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { dispatch, run } from './cli.js'
import * as claudeCode from './vendors/claude-code/adapter.js'
import type { Agent, Rule } from './rule.js'

const stubAgent: Agent = {
  reason: async () => ({ verdict: 'pass', reason: '' }),
}

describe('cli', () => {
  it('denies a write whose filename violates kebab-case', async () => {
    const { response } = await setup('write-new-file.json')

    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('allows a write whose filename matches kebab-case', async () => {
    const { response } = await setup('write-kebab-case.json')

    expect(response.hookSpecificOutput.permissionDecision).toBe('allow')
  })

  it('produces an empty allow response for a codex Bash payload that passes rules', async () => {
    const payload = readFileSync(
      'test/fixtures/codex/pre-bash-pwd.json',
      'utf8',
    )

    const response = await run(payload, { vendor: 'codex' })

    expect(response).toBe('')
  })

  it('produces an allow response for a github-copilot bash payload that passes rules', async () => {
    const payload = readFileSync(
      'test/fixtures/github-copilot/pre-bash-npm-test.json',
      'utf8',
    )

    const response = await run(payload, { vendor: 'github-copilot' })

    expect(JSON.parse(response)).toEqual({ permissionDecision: 'allow' })
  })

  it('returns a deny response when a rule crashes on the payload', async () => {
    const { response } = await setup('multi-edit.json')

    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('uses the ai client passed to dispatch for the ctx', async () => {
    let captured: unknown = undefined
    const capturingRule: Rule = (_action, ctx) => {
      captured = ctx
      return { kind: 'pass' as const }
    }
    const customAgent: Agent = {
      reason: async () => ({ verdict: 'pass', reason: '' }),
    }
    const payload = JSON.stringify({
      transcript_path: 'test/fixtures/transcripts/basic.jsonl',
      tool_name: 'Bash',
      tool_input: { command: 'x' },
    })

    await dispatch(claudeCode, payload, [capturingRule], customAgent)

    const ctx = captured as { agent?: Agent }
    expect(ctx.agent).toBe(customAgent)
  })

  it('passes a context with a working history() to rules', async () => {
    let captured: unknown = undefined
    const capturingRule: Rule = (_action, ctx) => {
      captured = ctx
      return { kind: 'pass' as const }
    }
    const payload = JSON.stringify({
      transcript_path: 'test/fixtures/transcripts/basic.jsonl',
      tool_name: 'Bash',
      tool_input: { command: 'x' },
    })

    await dispatch(claudeCode, payload, [capturingRule], stubAgent)

    const ctx = captured as { history: () => Promise<unknown[]> }
    expect(typeof ctx.history).toBe('function')
    const events = await ctx.history()
    expect(events).toContainEqual({ kind: 'prompt', text: 'add a test' })
  })

  it('returns a deny response when the payload is not valid JSON', async () => {
    const response = await dispatch(
      claudeCode,
      'not json at all',
      [],
      stubAgent,
    )
    const parsed = JSON.parse(response)

    expect(parsed.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(parsed.hookSpecificOutput.permissionDecisionReason).toMatch(
      /json|parse/i,
    )
  })

  it('returns a deny response when the adapter.toAction throws', async () => {
    const throwingAdapter = {
      toAction: () => {
        throw new Error('unsupported tool shape')
      },
      toResponse: claudeCode.toResponse,
    }
    const payload = JSON.stringify({ tool_name: 'Bash', tool_input: {} })

    const response = await dispatch(throwingAdapter, payload, [], stubAgent)
    const parsed = JSON.parse(response)

    expect(parsed.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(parsed.hookSpecificOutput.permissionDecisionReason).toMatch(
      /payload|unsupported tool shape/i,
    )
  })

  it('throws a clear error for an unknown agent', async () => {
    const payload = readFileSync(
      'test/fixtures/claude-code/write-new-file.json',
      'utf8',
    )

    await expect(
      run(payload, { vendor: 'bogus' as unknown as 'claude-code' }),
    ).rejects.toThrow(/unknown vendor.*bogus/i)
  })
})

async function setup(fixtureName: string) {
  const payload = readFileSync(
    `test/fixtures/claude-code/${fixtureName}`,
    'utf8',
  )
  const raw = await run(payload, { vendor: 'claude-code' })
  const response = JSON.parse(raw)
  return { response }
}
