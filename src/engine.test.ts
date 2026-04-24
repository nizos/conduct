import { describe, it, expect } from 'vitest'

import { evaluate } from './engine.js'
import { filenameCasing } from './rules/filename-casing.js'
import type { Rule } from './rule.js'

describe('engine', () => {
  it('allows a write whose filename matches the configured style', async () => {
    const decision = await evaluate(
      { type: 'write', path: 'src/user-profile.ts', content: '' },
      [filenameCasing({ style: 'kebab-case' })],
    )

    expect(decision).toEqual({ kind: 'allow' })
  })

  it('blocks a write whose filename violates the configured style', async () => {
    const decision = await evaluate(
      { type: 'write', path: 'src/userProfile.ts', content: '' },
      [filenameCasing({ style: 'kebab-case' })],
    )

    expect(decision.kind).toBe('block')
  })

  it('awaits async rules and returns an allow decision when they pass', async () => {
    const asyncPass: Rule = async () => ({ kind: 'pass' as const })

    const decision = await evaluate({ type: 'command', command: 'x' }, [
      asyncPass,
    ])

    expect(decision).toEqual({ kind: 'allow' })
  })
})
