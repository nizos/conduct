import { describe, it, expect } from 'vitest'

import { aiClientFromText } from './ai-client-from-text.js'

describe('aiClientFromText', () => {
  it('parses a verdict from the text source response', async () => {
    const client = aiClientFromText(
      async () => '{"verdict":"pass","reason":"ok"}',
    )

    const verdict = await client.reason('prompt')

    expect(verdict).toEqual({ verdict: 'pass', reason: 'ok' })
  })

  it('returns a fail-closed violation when the text source throws', async () => {
    const client = aiClientFromText(async () => {
      throw new Error('SDK transport failure')
    })

    const verdict = await client.reason('prompt')

    expect(verdict.verdict).toBe('violation')
    expect(verdict.reason).toMatch(/SDK transport failure/)
  })
})
