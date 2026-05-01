import { describe, it, expect } from 'vitest'

import { buildMatcher } from './match-paths.js'

describe('buildMatcher', () => {
  it('matches a path against an include glob', () => {
    const matches = buildMatcher(['src/**'])
    expect(matches('src/foo.ts')).toBe(true)
    expect(matches('README.md')).toBe(false)
  })

  it('treats a leading ! as a negation (exclude)', () => {
    const matches = buildMatcher(['src/**', '!src/**/*.test.ts'])
    expect(matches('src/foo.ts')).toBe(true)
    expect(matches('src/foo.test.ts')).toBe(false)
  })

  it('defaults to matching everything when only negations are given', () => {
    const matches = buildMatcher(['!node_modules/**'])
    expect(matches('src/foo.ts')).toBe(true)
    expect(matches('node_modules/pkg/index.js')).toBe(false)
  })

  it('rejects all paths when given an empty pattern list', () => {
    const matches = buildMatcher([])
    expect(matches('src/foo.ts')).toBe(false)
    expect(matches('anything')).toBe(false)
  })
})
