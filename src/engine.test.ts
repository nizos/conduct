import { describe, it, expect } from 'vitest'

import { configure, evaluate } from './engine.js'
import { filenameCasing } from './rules/filename-casing.js'

describe('engine', () => {
  it('allows a write whose filename matches the configured style', () => {
    const decision = evaluate({ type: 'write', path: 'src/user-profile.ts' }, [
      configure(filenameCasing, { style: 'kebab-case' }),
    ])

    expect(decision).toEqual({ kind: 'allow' })
  })

  it('blocks a write whose filename violates the configured style', () => {
    const decision = evaluate({ type: 'write', path: 'src/userProfile.ts' }, [
      configure(filenameCasing, { style: 'kebab-case' }),
    ])

    expect(decision.kind).toBe('block')
  })
})
