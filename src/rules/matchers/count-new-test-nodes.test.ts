import { describe, expect, it } from 'vitest'

import { countNewTestNodes } from './count-new-test-nodes.js'
import { javascript } from './languages/javascript.js'
import { python } from './languages/python.js'
import { typescript } from './languages/typescript.js'

describe.each([
  ['typescript', typescript],
  ['javascript', javascript],
] as const)('countNewTestNodes (%s)', (_name, language) => {
  it('returns 1 when a single it() call is added', () => {
    const before = `describe('x', () => {})`
    const after = `describe('x', () => { it('a', () => {}) })`

    expect(countNewTestNodes(before, after, language)).toBe(1)
  })

  it('counts test() calls as test nodes', () => {
    const before = `describe('x', () => {})`
    const after = `describe('x', () => { test('a', () => {}) })`

    expect(countNewTestNodes(before, after, language)).toBe(1)
  })

  it('counts it.skip() as a test node', () => {
    const before = `describe('x', () => {})`
    const after = `describe('x', () => { it.skip('a', () => {}) })`

    expect(countNewTestNodes(before, after, language)).toBe(1)
  })

  it('counts it.only() as a test node', () => {
    const before = `describe('x', () => {})`
    const after = `describe('x', () => { it.only('a', () => {}) })`

    expect(countNewTestNodes(before, after, language)).toBe(1)
  })

  it('counts test.skip() as a test node', () => {
    const before = `describe('x', () => {})`
    const after = `describe('x', () => { test.skip('a', () => {}) })`

    expect(countNewTestNodes(before, after, language)).toBe(1)
  })

  it('counts test.only() as a test node', () => {
    const before = `describe('x', () => {})`
    const after = `describe('x', () => { test.only('a', () => {}) })`

    expect(countNewTestNodes(before, after, language)).toBe(1)
  })

  it('does not count a new describe() with no tests inside as a test node', () => {
    const before = ``
    const after = `describe('x', () => {})`

    expect(countNewTestNodes(before, after, language)).toBe(0)
  })

  it('returns 2 when two tests are added in a single change', () => {
    const before = `describe('x', () => {})`
    const after = `describe('x', () => { it('a', () => {}); it('b', () => {}) })`

    expect(countNewTestNodes(before, after, language)).toBe(2)
  })

  it('returns 0 when an existing test is modified but no test is added', () => {
    const before = `describe('x', () => { it('a', () => { expect(1).toBe(1) }) })`
    const after = `describe('x', () => { it('a renamed', () => { expect(2).toBe(2) }) })`

    expect(countNewTestNodes(before, after, language)).toBe(0)
  })

  it('returns 0 when only non-test code is added', () => {
    const before = ``
    const after = `function add(a, b) { return a + b }`

    expect(countNewTestNodes(before, after, language)).toBe(0)
  })

  it('counts test.each() as a single test node', () => {
    const before = `describe('x', () => {})`
    const after = `describe('x', () => { test.each([1, 2])('case %i', (n) => {}) })`

    expect(countNewTestNodes(before, after, language)).toBe(1)
  })

  it('counts it.each() as a single test node', () => {
    const before = `describe('x', () => {})`
    const after = `describe('x', () => { it.each([1, 2])('case %i', (n) => {}) })`

    expect(countNewTestNodes(before, after, language)).toBe(1)
  })
})

describe('countNewTestNodes (python)', () => {
  it('counts a def test_*() function as a new test node', () => {
    const before = ``
    const after = `def test_addition():\n    assert 1 + 1 == 2\n`

    expect(countNewTestNodes(before, after, python)).toBe(1)
  })

  it('returns 0 when the language has no parser registered (peer-dep missing)', () => {
    const noParser = { name: 'fake', parser: undefined, patterns: [] }

    expect(
      countNewTestNodes(
        'def test_x(): pass',
        'def test_y(): pass\ndef test_z(): pass',
        noParser,
      ),
    ).toBe(0)
  })
})
