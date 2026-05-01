import { describe, it, expect } from 'vitest'

import { relativizePath } from './relativize-path.js'

describe('relativizePath', () => {
  it('relativizes an absolute path under cwd', () => {
    expect(
      relativizePath('/workspaces/conduct', '/workspaces/conduct/src/foo.ts'),
    ).toBe('src/foo.ts')
  })

  it('leaves a path that is already relative to cwd unchanged', () => {
    expect(relativizePath('/workspaces/conduct', 'src/foo.ts')).toBe(
      'src/foo.ts',
    )
  })

  it('returns ../-prefixed form for an absolute path that sits outside cwd', () => {
    expect(relativizePath('/workspaces/conduct', '/etc/passwd')).toBe(
      '../../etc/passwd',
    )
  })

  it('returns "." when path equals cwd', () => {
    expect(relativizePath('/workspaces/conduct', '/workspaces/conduct')).toBe(
      '.',
    )
  })

  it('falls back to process.cwd() when cwd is undefined', () => {
    const here = process.cwd()
    expect(relativizePath(undefined, `${here}/foo/bar.ts`)).toBe('foo/bar.ts')
  })

  it('returns POSIX-style separators even on hosts where path.sep is "\\"', () => {
    const result = relativizePath(
      '/workspaces/conduct',
      '/workspaces/conduct/src/sub/foo.ts',
    )

    expect(result).not.toContain('\\')
    expect(result).toBe('src/sub/foo.ts')
  })

  it('falls back to process.cwd() when cwd is an empty string', () => {
    const here = process.cwd()
    expect(relativizePath('', `${here}/foo/bar.ts`)).toBe('foo/bar.ts')
  })
})
