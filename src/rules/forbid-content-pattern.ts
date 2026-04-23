import type { Action, RuleResult } from '../rule'

export function forbidContentPattern(input: {
  action: Action
  options: { match: string; reason: string }
}): RuleResult {
  const { action, options } = input
  if (action.type === 'write' && action.content.includes(options.match)) {
    return { kind: 'violation', reason: options.reason }
  }
  return { kind: 'pass' }
}
