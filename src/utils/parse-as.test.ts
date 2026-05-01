import { describe, it, expect } from 'vitest'

import { parseAs } from './parse-as.js'

describe('parseAs', () => {
  it('parses JSON and applies the caller-provided type', () => {
    const result = parseAs<{ verdict: string }>('{"verdict":"pass"}')

    expect(result.verdict).toBe('pass')
  })
})
