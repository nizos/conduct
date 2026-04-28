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

  it('rejects names inherited from Object.prototype', () => {
    expect(isVendor('toString')).toBe(false)
    expect(isVendor('hasOwnProperty')).toBe(false)
  })
})

describe('vendors registry', () => {
  it('pairs each vendor with an adapter and a sync agent factory', () => {
    const entry = vendors['claude-code']
    expect(entry.adapter.actionSchema).toBeDefined()
    expect(entry.agent).toBeTypeOf('function')
    const agent = entry.agent()
    expect(agent.reason).toBeTypeOf('function')
  })

  it('exposes the matching transcript reader on each vendor entry', () => {
    expect(vendors['claude-code'].readTranscript).toBeTypeOf('function')
    expect(vendors['codex'].readTranscript).toBeTypeOf('function')
    expect(vendors['github-copilot'].readTranscript).toBeTypeOf('function')
    expect(vendors['github-copilot-chat'].readTranscript).toBeTypeOf('function')
  })

  it('exposes the github-copilot-chat entry with adapter, agent, and transcript reader', () => {
    const entry = vendors['github-copilot-chat']
    expect(entry.adapter.actionSchema).toBeDefined()
    expect(entry.agent).toBeTypeOf('function')
    expect(entry.readTranscript).toBeTypeOf('function')
  })
})
