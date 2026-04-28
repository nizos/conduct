import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, it, expect, onTestFinished } from 'vitest'

import type { Action, SessionEvent, Verdict } from '../types.js'
import { enforceTdd } from './enforce-tdd.js'

describe('enforce-tdd', () => {
  it('blocks a write when the AI judges it violates TDD', async () => {
    const { rule, ctx } = setup({
      verdict: {
        verdict: 'violation',
        reason: 'No failing test drives this implementation.',
      },
    })

    const result = await rule(writeAction(), ctx)

    expect(result).toMatchObject({
      kind: 'violation',
      reason: expect.stringContaining('failing test'),
    })
  })

  it('allows a write when the AI judges it passes TDD', async () => {
    const { rule, ctx } = setup()

    const result = await rule(writeAction(), ctx)

    expect(result).toEqual({ kind: 'pass' })
  })

  it('passes through command actions without calling the AI', async () => {
    const s = setup({
      verdict: { verdict: 'violation', reason: 'should not be reached' },
    })

    const result = await s.rule(
      { type: 'command', command: 'npm install' },
      s.ctx,
    )

    expect(result).toEqual({ kind: 'pass' })
    expect(s.agentCalled).toBe(false)
  })

  it('includes the action path and content in the AI prompt', async () => {
    const s = setup()

    await s.rule(
      writeAction('src/calc.ts', 'export const add = (a, b) => a + b'),
      s.ctx,
    )

    expect(s.capturedPrompt).toContain('src/calc.ts')
    expect(s.capturedPrompt).toContain('export const add')
  })

  it('includes recent session history in the AI prompt', async () => {
    const s = setup({
      history: [
        {
          kind: 'action',
          tool: 'Bash',
          input: { command: 'npm test' },
          output: '2 tests failed',
          toolUseId: 'tu_1',
        },
      ],
    })

    await s.rule(
      writeAction('src/calc.ts', 'export const add = () => 0'),
      s.ctx,
    )

    expect(s.capturedPrompt).toContain('2 tests failed')
  })

  it('includes tool names and user prompts in the history block', async () => {
    const s = setup({
      history: [
        { kind: 'prompt', text: 'add a test for the adder' },
        {
          kind: 'action',
          tool: 'Bash',
          input: { command: 'npm test' },
          output: '2 tests failed',
          toolUseId: 'tu_1',
        },
      ],
    })

    await s.rule(
      writeAction('src/calc.ts', 'export const add = () => 0'),
      s.ctx,
    )

    expect(s.capturedPrompt).toContain('add a test for the adder')
    expect(s.capturedPrompt).toContain('Bash')
    expect(s.capturedPrompt).toContain('npm test')
  })

  it('skips writes outside the configured paths', async () => {
    const s = setup({
      verdict: { verdict: 'violation', reason: 'should not reach' },
      paths: ['src/**'],
    })

    const result = await s.rule(writeAction('README.md', 'x'), s.ctx)

    expect(result).toEqual({ kind: 'pass' })
    expect(s.agentCalled).toBe(false)
  })

  it('uses custom instructions when provided', async () => {
    const s = setup({
      instructions: 'CUSTOM: only dog-driven development allowed',
    })

    await s.rule(writeAction('src/foo.ts', 'x'), s.ctx)

    expect(s.capturedPrompt).toContain('CUSTOM: only dog-driven development')
  })

  it('keeps the process instructions even when custom rules are provided', async () => {
    const s = setup({
      instructions: 'CUSTOM: only dog-driven development allowed',
    })

    await s.rule(writeAction('src/foo.ts', 'x'), s.ctx)

    expect(s.capturedPrompt).toMatch(/three inputs|chronological/i)
  })

  it('includes current file content in the prompt when the file exists', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'enforce-tdd-before-'))
    onTestFinished(async () => {
      await rm(dir, { recursive: true, force: true })
    })
    const filePath = path.join(dir, 'calc.ts')
    await writeFile(filePath, 'export const previous = 1')
    const s = setup()

    await s.rule(
      { type: 'write', path: filePath, content: 'new content' },
      s.ctx,
    )

    expect(s.capturedPrompt).toContain('export const previous = 1')
  })

  it('renders JSON-string event inputs as objects (no escape noise)', async () => {
    const s = setup({
      history: [
        {
          kind: 'action',
          tool: 'shell',
          input: '{"command":"npx vitest run"}',
          output: '1 test passed',
          toolUseId: 'tu_1',
        },
      ],
    })

    await s.rule(writeAction(), s.ctx)

    expect(s.capturedPrompt).toContain('shell({"command":"npx vitest run"})')
  })

  it('limits the history block to the last maxEvents events', async () => {
    const events: SessionEvent[] = Array.from({ length: 15 }, (_, i) => ({
      kind: 'prompt' as const,
      text: `event-${i}`,
    }))
    const s = setup({ history: events, maxEvents: 5 })

    await s.rule(writeAction(), s.ctx)

    expect(s.capturedPrompt).toContain('event-14')
    expect(s.capturedPrompt).toContain('event-10')
    expect(s.capturedPrompt).not.toContain('event-9')
  })

  it('rubric instructs the validator to flag multi-test additions', async () => {
    const s = setup()

    await s.rule(writeAction(), s.ctx)

    expect(s.capturedPrompt).toMatch(
      /one new test|single (?:new )?test|at most one/i,
    )
  })

  it('includes a TDD rubric and a JSON response spec in the prompt', async () => {
    const s = setup()

    await s.rule(
      writeAction('src/calc.ts', 'export const add = () => 0'),
      s.ctx,
    )

    expect(s.capturedPrompt).toMatch(/failing test/i)
    expect(s.capturedPrompt).toMatch(/verdict/i)
    expect(s.capturedPrompt).toMatch(/reason/i)
  })

  it('labels session, file, and pending-action sections with markdown headings', async () => {
    const s = setup({
      history: [{ kind: 'prompt', text: 'add a test' }],
    })

    await s.rule(
      writeAction('src/calc.ts', 'export const add = () => 0'),
      s.ctx,
    )

    expect(s.capturedPrompt).toContain('## Recent session')
    expect(s.capturedPrompt).toContain('## Current file content')
    expect(s.capturedPrompt).toContain('## Pending action')
  })
})

function setup(
  options: {
    verdict?: Verdict
    history?: SessionEvent[]
    paths?: string[]
    instructions?: string
    maxEvents?: number
    maxContentChars?: number
  } = {},
) {
  const verdict = options.verdict ?? { verdict: 'pass' as const, reason: '' }
  const state = { agentCalled: false, capturedPrompt: '' }
  const ctx = {
    agent: {
      reason: async (prompt: string) => {
        state.agentCalled = true
        state.capturedPrompt = prompt
        return verdict
      },
    },
    history: options.history ? async () => options.history! : undefined,
  }
  const rule = enforceTdd({
    paths: options.paths,
    instructions: options.instructions,
    maxEvents: options.maxEvents,
    maxContentChars: options.maxContentChars,
  })
  return {
    rule,
    ctx,
    get agentCalled() {
      return state.agentCalled
    },
    get capturedPrompt() {
      return state.capturedPrompt
    },
  }
}

function writeAction(
  path = 'src/calc.ts',
  content = 'export const add = (a, b) => a + b',
): Action {
  return { type: 'write', path, content }
}
