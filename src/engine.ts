import type { Action, RuleResult } from './rule'

export type Rule = (action: Action) => RuleResult

export type RuleDefinition<O> = (input: {
  action: Action
  options: O
}) => RuleResult

export type Decision = { kind: 'allow' } | { kind: 'block'; reason: string }

export function configure<O>(rule: RuleDefinition<O>, options: O): Rule {
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
