import { describe, it, expect } from 'vitest'

import { forbidCommandPattern } from './forbid-command-pattern'

describe('forbid-command-pattern', () => {
  it('blocks a command that matches the configured pattern', () => {
    const rule = forbidCommandPattern({
      match: 'npm install',
      reason: 'Use pnpm install',
    })
    const result = rule({ type: 'command', command: 'npm install' })

    expect(result).toMatchObject({ kind: 'violation' })
  })

  it('allows a command that does not match the configured pattern', () => {
    const rule = forbidCommandPattern({
      match: 'npm install',
      reason: 'Use pnpm install',
    })
    const result = rule({ type: 'command', command: 'echo foo' })

    expect(result).toEqual({ kind: 'pass' })
  })

  it('blocks a command that matches a configured regex', () => {
    const rule = forbidCommandPattern({
      match: /rm\s+-rf/,
      reason: 'Avoid destructive rm',
    })
    const result = rule({ type: 'command', command: 'rm -rf dist' })

    expect(result).toMatchObject({ kind: 'violation' })
  })

  it('uses the configured reason in the violation', () => {
    const rule = forbidCommandPattern({
      match: 'npm install',
      reason: 'Use pnpm install',
    })
    const result = rule({ type: 'command', command: 'npm install' })

    expect(result).toMatchObject({
      kind: 'violation',
      reason: 'Use pnpm install',
    })
  })
})
