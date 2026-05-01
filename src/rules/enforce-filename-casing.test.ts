import { describe, it, expect } from 'vitest'

import { enforceFilenameCasing, type Style } from './enforce-filename-casing.js'

describe('enforce-filename-casing', () => {
  describe('kebab-case', () => {
    const style = 'kebab-case'

    it('allows a kebab-case filename', () => {
      const { result } = setup({ path: 'src/user-profile.ts', style })

      expect(result).toEqual({ kind: 'pass' })
    })

    it.each([
      { casing: 'camelCase', path: 'src/userProfile.ts' },
      { casing: 'snake_case', path: 'src/user_profile.ts' },
    ])('blocks a $casing filename', ({ path }) => {
      const { result } = setup({ path, style })

      expect(result).toMatchObject({ kind: 'violation' })
    })

    it('allows a kebab-case basename when the path is absolute', () => {
      const { result } = setup({
        path: '/Users/foo/Project/src/user-profile.ts',
        style,
      })

      expect(result).toEqual({ kind: 'pass' })
    })
  })

  describe('camelCase', () => {
    const style = 'camelCase'

    it('allows a camelCase filename', () => {
      const { result } = setup({ path: 'src/userProfile.ts', style })

      expect(result).toEqual({ kind: 'pass' })
    })

    it.each([
      { casing: 'kebab-case', path: 'src/user-profile.ts' },
      { casing: 'PascalCase', path: 'src/UserProfile.ts' },
    ])('blocks a $casing filename', ({ path }) => {
      const { result } = setup({ path, style })

      expect(result).toMatchObject({ kind: 'violation' })
    })

    it('allows a camelCase basename when the path is absolute', () => {
      const { result } = setup({
        path: '/Users/foo/Project/src/userProfile.ts',
        style,
      })

      expect(result).toEqual({ kind: 'pass' })
    })
  })

  describe('snake_case', () => {
    const style = 'snake_case'

    it('allows a snake_case filename', () => {
      const { result } = setup({ path: 'src/user_profile.ts', style })

      expect(result).toEqual({ kind: 'pass' })
    })

    it('blocks a camelCase filename', () => {
      const { result } = setup({ path: 'src/userProfile.ts', style })

      expect(result).toMatchObject({ kind: 'violation' })
    })

    it('allows a snake_case basename when the path is absolute', () => {
      const { result } = setup({
        path: '/Users/foo/Project/src/user_profile.ts',
        style,
      })

      expect(result).toEqual({ kind: 'pass' })
    })
  })

  it('includes the path in the violation reason', async () => {
    const { result } = setup({
      path: 'src/userProfile.ts',
      style: 'kebab-case',
    })
    const awaited = await result

    expect(awaited.kind).toBe('violation')
    if (awaited.kind !== 'violation') return
    expect(awaited.reason).toContain('src/userProfile.ts')
  })

  it('passes a non-write action without inspecting path', () => {
    const rule = enforceFilenameCasing({ style: 'camelCase' })
    const result = rule({ type: 'command', command: 'npm install' })

    expect(result).toEqual({ kind: 'pass' })
  })
})

function setup({ path, style }: { path: string; style: Style }) {
  const rule = enforceFilenameCasing({ style })
  const result = rule({ type: 'write', path, content: '' })
  return { result }
}
