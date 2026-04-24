import { describe, it, expect } from 'vitest'

import { stringOrRegexMatches } from './string-or-regex-matches.js'

describe('stringOrRegexMatches', () => {
  it('matches a literal substring', () => {
    expect(stringOrRegexMatches('npm install foo', 'npm install')).toBe(true)
    expect(stringOrRegexMatches('npm run dev', 'npm install')).toBe(false)
  })

  it('matches a regex', () => {
    expect(stringOrRegexMatches('rm -rf /', /rm\s+-rf/)).toBe(true)
    expect(stringOrRegexMatches('git rm file', /rm\s+-rf/)).toBe(false)
  })
})
