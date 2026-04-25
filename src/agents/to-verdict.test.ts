import { describe, it, expect } from 'vitest'

import { toVerdict } from './to-verdict.js'

describe('toVerdict', () => {
  it('parses a verdict from the text source response', async () => {
    const verdict = await toVerdict(
      async () => '{"verdict":"pass","reason":"ok"}',
    )

    expect(verdict).toEqual({ verdict: 'pass', reason: 'ok' })
  })

  it('returns a fail-closed violation when the text source throws', async () => {
    const verdict = await toVerdict(async () => {
      throw new Error('SDK transport failure')
    })

    expect(verdict.verdict).toBe('violation')
    expect(verdict.reason).toMatch(/SDK transport failure/)
  })
})
