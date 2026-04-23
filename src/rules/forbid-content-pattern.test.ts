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

  it('skips a write whose path is outside the configured paths', () => {
    const result = forbidContentPattern({
      action: {
        type: 'write',
        path: 'other/location.ts',
        content: 'import MockedService from "./mocks"',
      },
      options: {
        paths: ['src/**/*.ts'],
        match: 'MockedService',
        reason: 'Use TestService instead',
      },
    })

    expect(result).toEqual({ kind: 'pass' })
  })

  it('blocks a write whose path matches the configured glob', () => {
    const result = forbidContentPattern({
      action: {
        type: 'write',
        path: 'src/user-profile.ts',
        content: 'import MockedService from "./mocks"',
      },
      options: {
        paths: ['src/**/*.ts'],
        match: 'MockedService',
        reason: 'Use TestService instead',
      },
    })

    expect(result).toMatchObject({ kind: 'violation' })
  })

  it('respects ! negation to exclude a subpath', () => {
    const result = forbidContentPattern({
      action: {
        type: 'write',
        path: 'src/user-profile.test.ts',
        content: 'import MockedService from "./mocks"',
      },
      options: {
        paths: ['src/**/*.ts', '!**/*.test.ts'],
        match: 'MockedService',
        reason: 'Use TestService instead',
      },
    })

    expect(result).toEqual({ kind: 'pass' })
  })
})
