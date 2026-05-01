import { describe, it, expect } from 'vitest'

import { evaluate } from './engine.js'
import type { Rule } from './rules/contract.js'

describe('engine', () => {
  it('returns allow when every rule passes', async () => {
    const alwaysPass: Rule = () => ({ kind: 'pass' as const })

    const decision = await evaluate({ type: 'command', command: 'x' }, [
      alwaysPass,
    ])

    expect(decision).toEqual({ kind: 'allow' })
  })

  it('returns block with the violation reason when a rule objects', async () => {
    const alwaysViolate: Rule = () => ({
      kind: 'violation' as const,
      reason: 'nope',
    })

    const decision = await evaluate({ type: 'command', command: 'x' }, [
      alwaysViolate,
    ])

    expect(decision).toEqual({ kind: 'block', reason: 'nope' })
  })

  it('awaits async rules and returns an allow decision when they pass', async () => {
    const asyncPass: Rule = () => Promise.resolve({ kind: 'pass' as const })

    const decision = await evaluate({ type: 'command', command: 'x' }, [
      asyncPass,
    ])

    expect(decision).toEqual({ kind: 'allow' })
  })

  it('passes the context to rules that accept it', async () => {
    let received: unknown = undefined
    const capturing: Rule = (_action, ctx) => {
      received = ctx
      return { kind: 'pass' as const }
    }
    const ctx = {}

    await evaluate({ type: 'command', command: 'x' }, [capturing], ctx)

    expect(received).toBe(ctx)
  })

  it('applies the rules in a rule block', async () => {
    const violate: Rule = () => ({ kind: 'violation' as const, reason: 'no' })

    const decision = await evaluate({ type: 'command', command: 'x' }, [
      { rules: [violate] },
    ])

    expect(decision).toEqual({ kind: 'block', reason: 'no' })
  })

  it('skips a rule block when the write path does not match files', async () => {
    const violate: Rule = () => ({ kind: 'violation' as const, reason: 'no' })

    const decision = await evaluate(
      { type: 'write', path: 'README.md', content: '' },
      [{ files: ['src/**'], rules: [violate] }],
    )

    expect(decision).toEqual({ kind: 'allow' })
  })

  it('applies a rule block with files to a command action (files only filters writes)', async () => {
    const violate: Rule = () => ({ kind: 'violation' as const, reason: 'no' })

    const decision = await evaluate({ type: 'command', command: 'rm -rf /' }, [
      { files: ['src/**'], rules: [violate] },
    ])

    expect(decision).toEqual({ kind: 'block', reason: 'no' })
  })

  it('processes multiple rule blocks in order, skipping non-matches and short-circuiting on the first violation', async () => {
    const fail: Rule = () => ({
      kind: 'violation' as const,
      reason: 'second block fired',
    })
    const unreached: Rule = () => {
      throw new Error('block should never run')
    }

    const decision = await evaluate(
      { type: 'write', path: 'src/foo.ts', content: '' },
      [
        { files: ['lib/**'], rules: [unreached] },
        { files: ['src/**'], rules: [fail] },
        { files: ['**/*.md'], rules: [unreached] },
      ],
    )

    expect(decision).toEqual({ kind: 'block', reason: 'second block fired' })
  })

  it('runtime-defends against an empty files array even though the type forbids it', async () => {
    const violate: Rule = () => ({ kind: 'violation' as const, reason: 'no' })

    const decision = await evaluate(
      { type: 'write', path: 'src/foo.ts', content: '' },
      [{ files: [] as unknown as readonly [string], rules: [violate] }],
    )

    expect(decision).toEqual({ kind: 'allow' })
  })

  it('turns a rule crash into a block decision (fail-closed)', async () => {
    const crashing: Rule = () => {
      throw new Error('kaboom')
    }

    const decision = await evaluate({ type: 'command', command: 'x' }, [
      crashing,
    ])

    expect(decision).toEqual({
      kind: 'block',
      reason: 'rule error: kaboom',
    })
  })
})
