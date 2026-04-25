import { describe, it, expect } from 'vitest'

import { vendors, isVendor } from './registry.js'

describe('isVendor', () => {
  it('accepts a known agent name', () => {
    expect(isVendor('claude-code')).toBe(true)
  })

  it('rejects an unknown string', () => {
    expect(isVendor('bogus')).toBe(false)
  })

  it('rejects a non-string value', () => {
    expect(isVendor(undefined)).toBe(false)
  })
})

describe('vendors registry', () => {
  it('pairs each vendor with an adapter and a sync agent factory', () => {
    const entry = vendors['claude-code']
    expect(entry.adapter.toAction).toBeTypeOf('function')
    expect(entry.agent).toBeTypeOf('function')
    const agent = entry.agent()
    expect(agent.reason).toBeTypeOf('function')
  })
})
