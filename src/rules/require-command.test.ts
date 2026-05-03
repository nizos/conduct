import { describe, it, expect } from 'vitest'

import type { RuleContext } from './contract.js'
import { requireCommand } from './require-command.js'

describe('requireCommand', () => {
  it('blocks a gated command when the required prior command is absent from history', async () => {
    const rule = requireCommand({
      before: { kind: 'command', match: /git commit/ },
      command: /lint/,
    })
    const ctx: RuleContext = { history: () => Promise.resolve([]) }

    const result = await rule(
      { kind: 'command', command: 'git commit -m feat' },
      ctx,
    )

    expect(result.kind).toBe('violation')
  })

  it('allows a gated command when the required prior command appears in history', async () => {
    const rule = requireCommand({
      before: { kind: 'command', match: /git commit/ },
      command: /lint/,
    })
    const ctx: RuleContext = {
      history: () =>
        Promise.resolve([
          { kind: 'command', command: 'npm run lint', output: 'ok' },
        ]),
    }

    const result = await rule(
      { kind: 'command', command: 'git commit -m feat' },
      ctx,
    )

    expect(result).toEqual({ kind: 'pass' })
  })

  it("passes through an action that does not match the rule's before clause", async () => {
    const rule = requireCommand({
      before: { kind: 'command', match: /git commit/ },
      command: /lint/,
    })
    const ctx: RuleContext = { history: () => Promise.resolve([]) }

    const result = await rule({ kind: 'command', command: 'ls -la' }, ctx)

    expect(result).toEqual({ kind: 'pass' })
  })

  it('falls back to an auto-generated reason naming the required pattern when none is provided', async () => {
    const rule = requireCommand({
      before: { kind: 'command', match: /git commit/ },
      command: /npm run lint/,
    })
    const ctx: RuleContext = { history: () => Promise.resolve([]) }

    const result = await rule(
      { kind: 'command', command: 'git commit -m feat' },
      ctx,
    )

    expect(result.kind).toBe('violation')
    if (result.kind !== 'violation') return
    expect(result.reason).toMatch(/npm run lint/)
    expect(result.reason.length).toBeGreaterThan(10)
  })

  it("surfaces the user's custom reason in the violation message", async () => {
    const rule = requireCommand({
      before: { kind: 'command', match: /git commit/ },
      command: /lint/,
      reason: 'Run npm run lint before committing.',
    })
    const ctx: RuleContext = { history: () => Promise.resolve([]) }

    const result = await rule(
      { kind: 'command', command: 'git commit -m feat' },
      ctx,
    )

    expect(result).toEqual({
      kind: 'violation',
      reason: 'Run npm run lint before committing.',
    })
  })

  it('blocks when the required command is in history but not the most recent event', async () => {
    const rule = requireCommand({
      before: { kind: 'command', match: /git commit/ },
      command: /lint/,
    })
    const ctx: RuleContext = {
      history: () =>
        Promise.resolve([
          { kind: 'command', command: 'npm run lint', output: 'ok' },
          { kind: 'command', command: 'ls', output: 'README.md' },
        ]),
    }

    const result = await rule(
      { kind: 'command', command: 'git commit -m feat' },
      ctx,
    )

    expect(result.kind).toBe('violation')
  })

  it('with `after: { kind: "write" }`, allows when only non-write events follow the required command', async () => {
    const rule = requireCommand({
      before: { kind: 'command', match: /git commit/ },
      command: /lint/,
      after: { kind: 'write' },
    })
    const ctx: RuleContext = {
      history: () =>
        Promise.resolve([
          { kind: 'command', command: 'npm run lint', output: 'ok' },
          { kind: 'command', command: 'git add .', output: '' },
        ]),
    }

    const result = await rule(
      { kind: 'command', command: 'git commit -m feat' },
      ctx,
    )

    expect(result).toEqual({ kind: 'pass' })
  })

  it('with `after: { kind: "write" }`, blocks when a write follows the required command', async () => {
    const rule = requireCommand({
      before: { kind: 'command', match: /git commit/ },
      command: /lint/,
      after: { kind: 'write' },
    })
    const ctx: RuleContext = {
      history: () =>
        Promise.resolve([
          { kind: 'command', command: 'npm run lint', output: 'ok' },
          {
            kind: 'write',
            path: '/abs/src/x.ts',
            content: 'x',
            output: 'written',
          },
        ]),
    }

    const result = await rule(
      { kind: 'command', command: 'git commit -m feat' },
      ctx,
    )

    expect(result.kind).toBe('violation')
  })

  it('with `after: { kind: "command", match: /git add/ }`, blocks when a matching command follows', async () => {
    const rule = requireCommand({
      before: { kind: 'command', match: /git commit/ },
      command: /lint/,
      after: { kind: 'command', match: /git add/ },
    })
    const ctx: RuleContext = {
      history: () =>
        Promise.resolve([
          { kind: 'command', command: 'npm run lint', output: 'ok' },
          { kind: 'command', command: 'git add .', output: '' },
        ]),
    }

    const result = await rule(
      { kind: 'command', command: 'git commit -m feat' },
      ctx,
    )

    expect(result.kind).toBe('violation')
  })

  it('with a `match` on `after`, allows when only a non-matching command follows', async () => {
    const rule = requireCommand({
      before: { kind: 'command', match: /git commit/ },
      command: /lint/,
      after: { kind: 'command', match: /git add/ },
    })
    const ctx: RuleContext = {
      history: () =>
        Promise.resolve([
          { kind: 'command', command: 'npm run lint', output: 'ok' },
          { kind: 'command', command: 'pwd', output: '/x' },
        ]),
    }

    const result = await rule(
      { kind: 'command', command: 'git commit -m feat' },
      ctx,
    )

    expect(result).toEqual({ kind: 'pass' })
  })
})
