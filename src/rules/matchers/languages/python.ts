import { isRegistered } from './register.js'

export const python = {
  name: 'python',
  parser: isRegistered('python') ? 'python' : undefined,
  patterns: [{ rule: { kind: 'function_definition', regex: '^def test_' } }],
} as const
