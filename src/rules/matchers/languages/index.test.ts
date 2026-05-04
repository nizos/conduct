import { describe, it, expect } from 'vitest'

import { csharp } from './csharp.js'
import { inferLanguage } from './index.js'
import { javascript } from './javascript.js'
import { python } from './python.js'
import { typescript } from './typescript.js'

describe('inferLanguage', () => {
  it('returns the typescript module for a .ts file', () => {
    expect(inferLanguage('src/foo.ts')).toBe(typescript)
  })

  it('returns the typescript module for a .tsx file', () => {
    expect(inferLanguage('src/foo.tsx')).toBe(typescript)
  })

  it('returns the javascript module for a .js file', () => {
    expect(inferLanguage('src/foo.js')).toBe(javascript)
  })

  it('returns the python module for a .py file', () => {
    expect(inferLanguage('src/foo.py')).toBe(python)
  })

  it('returns the csharp module for a .cs file', () => {
    expect(inferLanguage('src/Foo.cs')).toBe(csharp)
  })
})
