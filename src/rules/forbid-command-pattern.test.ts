import { describe, it, expect } from 'vitest'

import { forbidCommandPattern } from './forbid-command-pattern'

describe('forbid-command-pattern', () => {
  it('blocks a command that matches the configured pattern', () => {
    const result = forbidCommandPattern({
      action: { type: 'command', command: 'npm install' },
      options: { match: 'npm install', reason: 'Use pnpm install' },
    })

    expect(result).toMatchObject({ kind: 'violation' })
  })

  it('allows a command that does not match the configured pattern', () => {
    const result = forbidCommandPattern({
      action: { type: 'command', command: 'echo foo' },
      options: { match: 'npm install', reason: 'Use pnpm install' },
    })

    expect(result).toEqual({ kind: 'pass' })
  })

  it('uses the configured reason in the violation', () => {
    const result = forbidCommandPattern({
      action: { type: 'command', command: 'npm install' },
      options: { match: 'npm install', reason: 'Use pnpm install' },
    })

    expect(result).toMatchObject({
      kind: 'violation',
      reason: 'Use pnpm install',
    })
  })
})
