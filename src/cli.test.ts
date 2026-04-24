import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { dispatch, run } from './cli.js'
import * as claudeCode from './adapter/claude-code.js'
import type { Rule } from './rule.js'

describe('cli', () => {
  it('denies a write whose filename violates kebab-case', async () => {
    const { response } = await setup('write-new-file.json')

    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('allows a write whose filename matches kebab-case', async () => {
    const { response } = await setup('write-kebab-case.json')

    expect(response.hookSpecificOutput.permissionDecision).toBe('allow')
  })

  it('throws for codex until response translation is implemented', async () => {
    const payload = readFileSync(
      'test/fixtures/codex/bash-npm-install.json',
      'utf8',
    )

    await expect(run(payload, { agent: 'codex' })).rejects.toThrow(
      /codex.*toResponse/i,
    )
  })

  it('throws for github-copilot until response translation is implemented', async () => {
    const payload = readFileSync(
      'test/fixtures/github-copilot/bash-npm-install.json',
      'utf8',
    )

    await expect(run(payload, { agent: 'github-copilot' })).rejects.toThrow(
      /github-copilot.*toResponse/i,
    )
  })

  it('returns a deny response when a rule crashes on the payload', async () => {
    const { response } = await setup('multi-edit.json')

    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('injects an ai client into the ctx', async () => {
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

    await dispatch(claudeCode, payload, [capturingRule])

    const ctx = captured as { ai?: { reason?: unknown } }
    expect(typeof ctx.ai?.reason).toBe('function')
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

    await dispatch(claudeCode, payload, [capturingRule])

    const ctx = captured as { history: () => Promise<unknown[]> }
    expect(typeof ctx.history).toBe('function')
    const events = await ctx.history()
    expect(events).toContainEqual({ kind: 'prompt', text: 'add a test' })
  })

  it('returns a deny response when the payload is not valid JSON', async () => {
    const response = await dispatch(claudeCode, 'not json at all', [])
    const parsed = JSON.parse(response)

    expect(parsed.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(parsed.hookSpecificOutput.permissionDecisionReason).toMatch(
      /json|parse/i,
    )
  })

  it('throws a clear error for an unknown agent', async () => {
    const payload = readFileSync(
      'test/fixtures/claude-code/write-new-file.json',
      'utf8',
    )

    await expect(
      run(payload, { agent: 'bogus' as unknown as 'claude-code' }),
    ).rejects.toThrow(/unknown agent.*bogus/i)
  })
})

async function setup(fixtureName: string) {
  const payload = readFileSync(
    `test/fixtures/claude-code/${fixtureName}`,
    'utf8',
  )
  const raw = await run(payload, { agent: 'claude-code' })
  const response = JSON.parse(raw)
  return { response }
}
