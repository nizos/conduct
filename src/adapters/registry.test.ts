import { describe, it, expect } from 'vitest'

import { isAgent } from './registry.js'

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
