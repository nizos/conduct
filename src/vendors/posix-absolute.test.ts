import { describe, it, expect } from 'vitest'

import { posixAbsolute } from './posix-absolute.js'

describe('posixAbsolute', () => {
  it('resolves a relative path against cwd', () => {
    expect(posixAbsolute('/workspaces/probity', 'src/foo.ts')).toBe(
      '/workspaces/probity/src/foo.ts',
    )
  })
})
