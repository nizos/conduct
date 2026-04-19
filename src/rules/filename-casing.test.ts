import { describe, it, expect } from 'vitest'

import { filenameCasing, type Style } from './filename-casing.js'

describe('filename-casing', () => {
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
  })

  it('includes the path in the violation reason', () => {
    const { result } = setup({
      path: 'src/userProfile.ts',
      style: 'kebab-case',
    })

    expect(result).toMatchObject({
      kind: 'violation',
      reason: expect.stringContaining('src/userProfile.ts'),
    })
  })
})

function setup({ path, style }: { path: string; style: Style }) {
  const result = filenameCasing({
    action: { type: 'write', path },
    options: { style },
  })
  return { result }
}
