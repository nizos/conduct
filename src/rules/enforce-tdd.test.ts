import { describe, it, expect } from 'vitest'

import { enforceTdd } from './enforce-tdd.js'
import { fakeCtx } from '../../test/helpers/fake-ctx.js'

describe('enforce-tdd', () => {
  it('blocks a write when the AI judges it violates TDD', async () => {
    const ctx = fakeCtx({
      ai: {
        reason: async () => ({
          verdict: 'violation',
          reason: 'No failing test drives this implementation.',
        }),
      },
    })
    const rule = enforceTdd()

    const result = await rule(
      {
        type: 'write',
        path: 'src/calc.ts',
        content: 'export const add = (a, b) => a + b',
      },
      ctx,
    )

    expect(result).toMatchObject({
      kind: 'violation',
      reason: expect.stringContaining('failing test'),
    })
  })

  it('allows a write when the AI judges it passes TDD', async () => {
    const ctx = fakeCtx({
      ai: {
        reason: async () => ({ verdict: 'pass', reason: '' }),
      },
    })
    const rule = enforceTdd()

    const result = await rule(
      {
        type: 'write',
        path: 'src/calc.ts',
        content: 'export const add = (a, b) => a + b',
      },
      ctx,
    )

    expect(result).toEqual({ kind: 'pass' })
  })
})
