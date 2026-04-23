import type { Action, RuleResult } from '../rule'

export function forbidCommandPattern(input: {
  action: Action
  options: { match: string; reason: string }
}): RuleResult {
  const { action, options } = input
  if (action.type === 'command' && action.command.includes(options.match)) {
    return { kind: 'violation', reason: options.reason }
  }
  return { kind: 'pass' }
}
