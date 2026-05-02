import { describe, it, expect } from 'vitest'

import { relativizePath } from './relativize-path.js'

describe('relativizePath', () => {
  it('relativizes an absolute path under cwd', () => {
    expect(
      relativizePath('/workspaces/probity', '/workspaces/probity/src/foo.ts'),
    ).toBe('src/foo.ts')
  })

  it('leaves a path that is already relative to cwd unchanged', () => {
    expect(relativizePath('/workspaces/probity', 'src/foo.ts')).toBe(
      'src/foo.ts',
    )
  })

  it('returns ../-prefixed form for an absolute path that sits outside cwd', () => {
    expect(relativizePath('/workspaces/probity', '/etc/passwd')).toBe(
      '../../etc/passwd',
    )
  })

  it('returns "." when path equals cwd', () => {
    expect(relativizePath('/workspaces/probity', '/workspaces/probity')).toBe(
      '.',
    )
  })

  it('returns POSIX-style separators even on hosts where path.sep is "\\"', () => {
    const result = relativizePath(
      '/workspaces/probity',
      '/workspaces/probity/src/sub/foo.ts',
    )

    expect(result).not.toContain('\\')
    expect(result).toBe('src/sub/foo.ts')
  })
})
