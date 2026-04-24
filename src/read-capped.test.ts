import { describe, it, expect } from 'vitest'

import { readCapped } from './read-capped.js'

describe('readCapped', () => {
  it('returns the accumulated content when total bytes stay under the cap', () => {
    const chunks = [Buffer.from('hello '), Buffer.from('world')]
    let i = 0
    const read = (buf: Buffer, offset: number, length: number) => {
      const chunk = chunks[i++]
      if (!chunk) return 0
      const n = Math.min(chunk.length, length)
      chunk.copy(buf, offset, 0, n)
      return n
    }

    expect(readCapped(read, 100)).toBe('hello world')
  })

  it('throws when the total bytes exceed the cap', () => {
    const data = Buffer.from('more than ten bytes of data')
    let offset = 0
    const read = (buf: Buffer, bufOffset: number, length: number) => {
      const remaining = data.length - offset
      if (remaining === 0) return 0
      const n = Math.min(remaining, length)
      data.copy(buf, bufOffset, offset, offset + n)
      offset += n
      return n
    }

    expect(() => readCapped(read, 10)).toThrow(/cap|bytes|exceeds/i)
  })
})
