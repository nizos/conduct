import { describe, it, expect } from 'vitest'

import { JsonString } from './json-string.js'

describe('JsonString', () => {
  it('parses a valid JSON string into the represented value', () => {
    const result = JsonString.safeParse('{"a":1}')

    expect(result.success && result.data).toEqual({ a: 1 })
  })

  it('reports a zod issue for invalid JSON instead of throwing', () => {
    const result = JsonString.safeParse('not json')

    expect(result.success).toBe(false)
  })
})
