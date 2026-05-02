import { describe, it, expect } from 'vitest'

import { forbidContentPattern } from './forbid-content-pattern.js'

describe('forbid-content-pattern', () => {
  it('blocks a write whose content matches the configured pattern', () => {
    const rule = forbidContentPattern({
      match: 'MockedService',
      reason: 'Use TestService instead',
    })
    const result = rule({
      kind: 'write',
      path: 'src/user-profile.ts',
      content: 'import MockedService from "./mocks"',
    })

    expect(result).toMatchObject({ kind: 'violation' })
  })

  it('allows a write whose content does not match the configured pattern', () => {
    const rule = forbidContentPattern({
      match: 'MockedService',
      reason: 'Use TestService instead',
    })
    const result = rule({
      kind: 'write',
      path: 'src/user-profile.ts',
      content: 'import TestService from "./test-service"',
    })

    expect(result).toEqual({ kind: 'pass' })
  })

  it('uses the configured reason in the violation', () => {
    const rule = forbidContentPattern({
      match: 'MockedService',
      reason: 'Use TestService instead',
    })
    const result = rule({
      kind: 'write',
      path: 'src/user-profile.ts',
      content: 'import MockedService from "./mocks"',
    })

    expect(result).toMatchObject({
      kind: 'violation',
      reason: 'Use TestService instead',
    })
  })

  it('blocks a write whose content matches a configured regex', () => {
    const rule = forbidContentPattern({
      match: /Mocked\w+/,
      reason: 'Use TestService instead',
    })
    const result = rule({
      kind: 'write',
      path: 'src/user-profile.ts',
      content: 'import MockedService from "./mocks"',
    })

    expect(result).toMatchObject({ kind: 'violation' })
  })

  it('handles a global regex consistently across invocations', () => {
    const rule = forbidContentPattern({
      match: /Mocked/g,
      reason: 'Use TestService instead',
    })
    const action = {
      kind: 'write' as const,
      path: 'src/user-profile.ts',
      content: 'MockedService',
    }

    expect(rule(action)).toMatchObject({ kind: 'violation' })
    expect(rule(action)).toMatchObject({ kind: 'violation' })
  })
})
