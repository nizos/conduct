import { describe, it, expect } from 'vitest'

import { configure, evaluate } from './engine'
import { filenameCasing } from './rules/filename-casing'

describe('engine', () => {
  it('allows a write whose filename matches the configured style', () => {
    const decision = evaluate(
      { type: 'write', path: 'src/user-profile.ts', content: '' },
      [configure(filenameCasing, { style: 'kebab-case' })],
    )

    expect(decision).toEqual({ kind: 'allow' })
  })

  it('blocks a write whose filename violates the configured style', () => {
    const decision = evaluate(
      { type: 'write', path: 'src/userProfile.ts', content: '' },
      [configure(filenameCasing, { style: 'kebab-case' })],
    )

    expect(decision.kind).toBe('block')
  })
})
