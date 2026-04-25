import { describe, it, expect } from 'vitest'

import { adapters, isAgent } from './registry.js'

describe('isAgent', () => {
  it('accepts a known agent name', () => {
    expect(isAgent('claude-code')).toBe(true)
  })

  it('rejects an unknown string', () => {
    expect(isAgent('bogus')).toBe(false)
  })

  it('rejects a non-string value', () => {
    expect(isAgent(undefined)).toBe(false)
  })
})

describe('adapters registry', () => {
  it('pairs each agent with an adapter and a lazy async makeAi factory', async () => {
    const entry = adapters['claude-code']
    expect(entry.adapter.toAction).toBeTypeOf('function')
    expect(entry.makeAi).toBeTypeOf('function')
    const ai = await entry.makeAi()
    expect(ai.reason).toBeTypeOf('function')
  })
})
