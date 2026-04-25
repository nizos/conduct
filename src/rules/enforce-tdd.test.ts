import { describe, it, expect } from 'vitest'

import { enforceTdd } from './enforce-tdd.js'

describe('enforce-tdd', () => {
  it('blocks a write when the AI judges it violates TDD', async () => {
    const ctx = {
      agent: {
        reason: async () => ({
          verdict: 'violation' as const,
          reason: 'No failing test drives this implementation.',
        }),
      },
    }
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
    const ctx = {
      agent: {
        reason: async () => ({ verdict: 'pass' as const, reason: '' }),
      },
    }
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
    const ctx = {
      agent: {
        reason: async () => {
          called = true
          return {
            verdict: 'violation' as const,
            reason: 'should not be reached',
          }
        },
      },
    }
    const rule = enforceTdd()

    const result = await rule({ type: 'command', command: 'npm install' }, ctx)

    expect(result).toEqual({ kind: 'pass' })
    expect(called).toBe(false)
  })

  it('includes the action path and content in the AI prompt', async () => {
    let capturedPrompt = ''
    const ctx = {
      agent: {
        reason: async (prompt: string) => {
          capturedPrompt = prompt
          return { verdict: 'pass' as const, reason: '' }
        },
      },
    }
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
    const ctx = {
      agent: {
        reason: async (prompt: string) => {
          capturedPrompt = prompt
          return { verdict: 'pass' as const, reason: '' }
        },
      },
      history: async () => [
        {
          kind: 'action' as const,
          tool: 'Bash',
          input: { command: 'npm test' },
          output: '2 tests failed',
          toolUseId: 'tu_1',
        },
      ],
    }
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

  it('includes tool names and user prompts in the history block', async () => {
    let capturedPrompt = ''
    const ctx = {
      agent: {
        reason: async (prompt: string) => {
          capturedPrompt = prompt
          return { verdict: 'pass' as const, reason: '' }
        },
      },
      history: async () => [
        { kind: 'prompt' as const, text: 'add a test for the adder' },
        {
          kind: 'action' as const,
          tool: 'Bash',
          input: { command: 'npm test' },
          output: '2 tests failed',
          toolUseId: 'tu_1',
        },
      ],
    }
    const rule = enforceTdd()

    await rule(
      {
        type: 'write',
        path: 'src/calc.ts',
        content: 'export const add = () => 0',
      },
      ctx,
    )

    expect(capturedPrompt).toContain('add a test for the adder')
    expect(capturedPrompt).toContain('Bash')
    expect(capturedPrompt).toContain('npm test')
  })

  it('skips writes outside the configured paths', async () => {
    let called = false
    const ctx = {
      agent: {
        reason: async () => {
          called = true
          return { verdict: 'violation' as const, reason: 'should not reach' }
        },
      },
    }
    const rule = enforceTdd({ paths: ['src/**'] })

    const result = await rule(
      { type: 'write', path: 'README.md', content: 'x' },
      ctx,
    )

    expect(result).toEqual({ kind: 'pass' })
    expect(called).toBe(false)
  })

  it('uses custom instructions when provided', async () => {
    let capturedPrompt = ''
    const ctx = {
      agent: {
        reason: async (prompt: string) => {
          capturedPrompt = prompt
          return { verdict: 'pass' as const, reason: '' }
        },
      },
    }
    const rule = enforceTdd({
      instructions: 'CUSTOM: only dog-driven development allowed',
    })

    await rule({ type: 'write', path: 'src/foo.ts', content: 'x' }, ctx)

    expect(capturedPrompt).toContain('CUSTOM: only dog-driven development')
  })

  it('includes a TDD rubric and a JSON response spec in the prompt', async () => {
    let capturedPrompt = ''
    const ctx = {
      agent: {
        reason: async (prompt: string) => {
          capturedPrompt = prompt
          return { verdict: 'pass' as const, reason: '' }
        },
      },
    }
    const rule = enforceTdd()

    await rule(
      {
        type: 'write',
        path: 'src/calc.ts',
        content: 'export const add = () => 0',
      },
      ctx,
    )

    expect(capturedPrompt).toMatch(/failing test/i)
    expect(capturedPrompt).toMatch(/verdict/i)
    expect(capturedPrompt).toMatch(/reason/i)
  })
})
