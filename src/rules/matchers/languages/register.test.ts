import { describe, it, expect } from 'vitest'

import { isRegistered } from './register.js'

describe('register', () => {
  it('reports python as registered when @ast-grep/lang-python is available', () => {
    expect(isRegistered('python')).toBe(true)
  })

  it('reports csharp as registered when @ast-grep/lang-csharp is available', () => {
    expect(isRegistered('csharp')).toBe(true)
  })
})
