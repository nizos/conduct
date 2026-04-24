import { describe, it, expectTypeOf } from 'vitest'

import type { Decision } from './rule.js'

describe('rule types', () => {
  it('exports Decision as canonical vocabulary', () => {
    expectTypeOf<Decision>().toEqualTypeOf<
      { kind: 'allow' } | { kind: 'block'; reason: string }
    >()
  })
})
