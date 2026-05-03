import { describe, it, expect } from 'vitest'

import { toCanonical } from './event.js'

describe('toCanonical (claude-code)', () => {
  it('passes prompt events through unchanged', () => {
    const result = toCanonical({ kind: 'prompt', text: 'add a test' })

    expect(result).toEqual({ kind: 'prompt', text: 'add a test' })
  })

  it('classifies a Bash action as a command event', () => {
    const result = toCanonical({
      kind: 'action',
      tool: 'Bash',
      input: { command: 'npm test' },
      output: 'PASS',
      toolUseId: 'tu_1',
    })

    expect(result).toEqual({
      kind: 'command',
      command: 'npm test',
      output: 'PASS',
    })
  })

  it('classifies a Write action as a write event', () => {
    const result = toCanonical({
      kind: 'action',
      tool: 'Write',
      input: { file_path: '/abs/src/calc.ts', content: 'export const x = 1' },
      output: 'File written',
      toolUseId: 'tu_2',
    })

    expect(result).toEqual({
      kind: 'write',
      path: '/abs/src/calc.ts',
      content: 'export const x = 1',
      output: 'File written',
    })
  })

  it('classifies an unrecognized tool as an other event, preserving raw input', () => {
    const result = toCanonical({
      kind: 'action',
      tool: 'TodoWrite',
      input: { todos: ['x'] },
      output: 'ok',
      toolUseId: 'tu_3',
    })

    expect(result).toEqual({
      kind: 'other',
      tool: 'TodoWrite',
      input: { todos: ['x'] },
      output: 'ok',
    })
  })
})
