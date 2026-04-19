import type { Action, Rule, RuleDefinition } from './rule'

export type Decision = { kind: 'allow' } | { kind: 'block'; reason: string }

export function configure<Options>(
  rule: RuleDefinition<Options>,
  options: Options,
): Rule {
  return (action) => rule({ action, options })
}

export function evaluate(action: Action, rules: Rule[]): Decision {
  for (const rule of rules) {
    const result = rule(action)
    if (result.kind === 'violation') {
      return { kind: 'block', reason: result.reason }
    }
  }
  return { kind: 'allow' }
}
