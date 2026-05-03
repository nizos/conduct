import { describe, it, expect } from 'vitest'

import { toCanonical } from './event.js'

describe('toCanonical (codex)', () => {
  it('passes prompt events through unchanged', () => {
    const result = toCanonical({ kind: 'prompt', text: 'hello' })

    expect(result).toEqual({ kind: 'prompt', text: 'hello' })
  })

  it('classifies an exec_command action as a command event', () => {
    const result = toCanonical({
      kind: 'action',
      tool: 'exec_command',
      input: { cmd: 'pwd', workdir: '/x' },
      output: 'output',
      toolUseId: 'call_1',
    })

    expect(result).toEqual({
      kind: 'command',
      command: 'pwd',
      output: 'output',
    })
  })

  it('classifies a shell action as a command event', () => {
    const result = toCanonical({
      kind: 'action',
      tool: 'shell',
      input: { command: 'npm test' },
      output: 'PASS',
      toolUseId: 'call_2',
    })

    expect(result).toEqual({
      kind: 'command',
      command: 'npm test',
      output: 'PASS',
    })
  })

  it('classifies an unrecognized tool as an other event, preserving raw input', () => {
    const result = toCanonical({
      kind: 'action',
      tool: 'apply_patch',
      input: '*** Begin Patch\n*** Add File: src/x.ts\n+x\n*** End Patch\n',
      output: 'Success.',
      toolUseId: 'call_3',
    })

    expect(result).toEqual({
      kind: 'other',
      tool: 'apply_patch',
      input: '*** Begin Patch\n*** Add File: src/x.ts\n+x\n*** End Patch\n',
      output: 'Success.',
    })
  })
})
