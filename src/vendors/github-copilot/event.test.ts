import { describe, it, expect } from 'vitest'

import { toCanonical } from './event.js'

describe('toCanonical (github-copilot)', () => {
  it('passes prompt events through unchanged', () => {
    const result = toCanonical({ kind: 'prompt', text: 'hi' })

    expect(result).toEqual({ kind: 'prompt', text: 'hi' })
  })

  it('classifies a bash action as a command event', () => {
    const result = toCanonical({
      kind: 'action',
      tool: 'bash',
      input: { command: 'npm test' },
      output: 'PASS',
      toolUseId: 'call_1',
    })

    expect(result).toEqual({
      kind: 'command',
      command: 'npm test',
      output: 'PASS',
    })
  })

  it('classifies a create action as a write event', () => {
    const result = toCanonical({
      kind: 'action',
      tool: 'create',
      input: { path: '/abs/src/calc.ts', file_text: 'export const x = 1' },
      output: 'Created file src/calc.ts',
      toolUseId: 'call_2',
    })

    expect(result).toEqual({
      kind: 'write',
      path: '/abs/src/calc.ts',
      content: 'export const x = 1',
      output: 'Created file src/calc.ts',
    })
  })

  it('classifies an unrecognized tool as an other event, preserving raw input', () => {
    const result = toCanonical({
      kind: 'action',
      tool: 'report_intent',
      input: { intent: 'Running tests' },
      output: '',
      toolUseId: 'call_3',
    })

    expect(result).toEqual({
      kind: 'other',
      tool: 'report_intent',
      input: { intent: 'Running tests' },
      output: '',
    })
  })
})
