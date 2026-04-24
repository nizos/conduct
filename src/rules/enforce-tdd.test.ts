import { describe, it, expect } from 'vitest'

import { enforceTdd } from './enforce-tdd.js'
import { fakeCtx } from '../../test/helpers/fake-ctx.js'

describe('enforce-tdd', () => {
  it('blocks a write when the AI judges it violates TDD', async () => {
    const ctx = fakeCtx({
      ai: {
        reason: async () => ({
          verdict: 'violation' as const,
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
        reason: async () => ({ verdict: 'pass' as const, reason: '' }),
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

  it('passes through command actions without calling the AI', async () => {
    let called = false
    const ctx = fakeCtx({
      ai: {
        reason: async () => {
          called = true
          return {
            verdict: 'violation' as const,
            reason: 'should not be reached',
          }
        },
      },
    })
    const rule = enforceTdd()

    const result = await rule({ type: 'command', command: 'npm install' }, ctx)

    expect(result).toEqual({ kind: 'pass' })
    expect(called).toBe(false)
  })

  it('includes the action path and content in the AI prompt', async () => {
    let capturedPrompt = ''
    const ctx = fakeCtx({
      ai: {
        reason: async ({ prompt }: { prompt: string }) => {
          capturedPrompt = prompt
          return { verdict: 'pass' as const, reason: '' }
        },
      },
    })
    const rule = enforceTdd()

    await rule(
      {
        type: 'write',
        path: 'src/calc.ts',
        content: 'export const add = (a, b) => a + b',
      },
      ctx,
    )

    expect(capturedPrompt).toContain('src/calc.ts')
    expect(capturedPrompt).toContain('export const add')
  })

  it('includes recent session history in the AI prompt', async () => {
    let capturedPrompt = ''
    const ctx = fakeCtx({
      ai: {
        reason: async ({ prompt }: { prompt: string }) => {
          capturedPrompt = prompt
          return { verdict: 'pass' as const, reason: '' }
        },
      },
      history: async () => [{ output: '2 tests failed' }],
    })
    const rule = enforceTdd()

    await rule(
      {
        type: 'write',
        path: 'src/calc.ts',
        content: 'export const add = () => 0',
      },
      ctx,
    )

    expect(capturedPrompt).toContain('2 tests failed')
  })
})
