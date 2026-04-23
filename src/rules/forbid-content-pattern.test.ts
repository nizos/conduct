import { describe, it, expect } from 'vitest'

import { forbidContentPattern } from './forbid-content-pattern'

describe('forbid-content-pattern', () => {
  it('blocks a write whose content matches the configured pattern', () => {
    const result = forbidContentPattern({
      action: {
        type: 'write',
        path: 'src/user-profile.ts',
        content: 'import MockedService from "./mocks"',
      },
      options: { match: 'MockedService', reason: 'Use TestService instead' },
    })

    expect(result).toMatchObject({ kind: 'violation' })
  })

  it('allows a write whose content does not match the configured pattern', () => {
    const result = forbidContentPattern({
      action: {
        type: 'write',
        path: 'src/user-profile.ts',
        content: 'import TestService from "./test-service"',
      },
      options: { match: 'MockedService', reason: 'Use TestService instead' },
    })

    expect(result).toEqual({ kind: 'pass' })
  })

  it('uses the configured reason in the violation', () => {
    const result = forbidContentPattern({
      action: {
        type: 'write',
        path: 'src/user-profile.ts',
        content: 'import MockedService from "./mocks"',
      },
      options: { match: 'MockedService', reason: 'Use TestService instead' },
    })

    expect(result).toMatchObject({
      kind: 'violation',
      reason: 'Use TestService instead',
    })
  })
})
