import { describe, it, expect } from 'vitest'

import { countNewTestNodes } from './count-new-test-nodes.js'
import { typescript } from './languages/typescript.js'

describe('countNewTestNodes', () => {
  it('returns 1 when a single it() call is added', () => {
    const before = `describe('x', () => {})`
    const after = `describe('x', () => { it('a', () => {}) })`

    expect(countNewTestNodes(before, after, typescript)).toBe(1)
  })
})
