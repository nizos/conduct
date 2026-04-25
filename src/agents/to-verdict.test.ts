import { describe, it, expect } from 'vitest'

import { toVerdict } from './to-verdict.js'

describe('toVerdict', () => {
  it('parses a plain JSON verdict from the text source response', async () => {
    const verdict = await toVerdict(
      async () => '{"verdict":"pass","reason":"ok"}',
    )

    expect(verdict).toEqual({ verdict: 'pass', reason: 'ok' })
  })

  it('returns a fail-closed violation when the text is not valid JSON', async () => {
    const verdict = await toVerdict(async () => 'not json at all')

    expect(verdict.verdict).toBe('violation')
    expect(verdict.reason).toMatch(/parse|invalid|json/i)
  })

  it('returns a fail-closed violation when the verdict field is unexpected', async () => {
    const verdict = await toVerdict(
      async () => '{"verdict":"maybe","reason":"unsure"}',
    )

    expect(verdict.verdict).toBe('violation')
    expect(verdict.reason).toMatch(/unexpected|invalid|shape|verdict/i)
  })

  it('parses a verdict wrapped in a JSON code fence', async () => {
    const fenced = '```json\n{"verdict":"pass","reason":"fine"}\n```'
    const verdict = await toVerdict(async () => fenced)

    expect(verdict).toEqual({ verdict: 'pass', reason: 'fine' })
  })

  it('returns a fail-closed violation when the text source throws', async () => {
    const verdict = await toVerdict(async () => {
      throw new Error('SDK transport failure')
    })

    expect(verdict.verdict).toBe('violation')
    expect(verdict.reason).toMatch(/SDK transport failure/)
  })
})
