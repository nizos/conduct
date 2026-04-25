import { describe, it, expect } from 'vitest'

import { parseVerdict } from './parse-verdict.js'

describe('parseVerdict', () => {
  it('parses a plain JSON verdict', () => {
    expect(parseVerdict('{"verdict":"pass","reason":"ok"}')).toEqual({
      verdict: 'pass',
      reason: 'ok',
    })
  })

  it('parses a JSON verdict wrapped in a ```json code fence', () => {
    expect(
      parseVerdict('```json\n{"verdict":"pass","reason":"fine"}\n```'),
    ).toEqual({ verdict: 'pass', reason: 'fine' })
  })

  it('returns a violation when the text is not valid JSON', () => {
    const v = parseVerdict('not json at all')
    expect(v.verdict).toBe('violation')
    expect(v.reason).toMatch(/parse|invalid|json/i)
  })

  it('returns a violation when verdict is neither pass nor violation', () => {
    const v = parseVerdict('{"verdict":"maybe","reason":"unsure"}')
    expect(v.verdict).toBe('violation')
    expect(v.reason).toMatch(/unexpected|invalid|shape|verdict/i)
  })
})
