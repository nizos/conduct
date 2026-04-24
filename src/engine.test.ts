import { describe, it, expect } from 'vitest'

import { evaluate, evaluateSafely } from './engine.js'
import type { Rule } from './rule.js'

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
    const asyncPass: Rule = async () => ({ kind: 'pass' as const })

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

  it('evaluateSafely turns a rule crash into a block decision', async () => {
    const crashing: Rule = () => {
      throw new Error('kaboom')
    }

    const decision = await evaluateSafely({ type: 'command', command: 'x' }, [
      crashing,
    ])

    expect(decision).toEqual({
      kind: 'block',
      reason: 'rule error: kaboom',
    })
  })
})
