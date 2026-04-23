import type { Action, Rule, RuleDefinition } from './rule'

/**
 * The engine's decision after evaluating rules against an action.
 *
 * - `allow` — no rule objected; the action may proceed.
 * - `block` — a rule objected; `reason` is surfaced back to the agent
 *   via its adapter's response format.
 */
export type Decision = { kind: 'allow' } | { kind: 'block'; reason: string }

/**
 * Bind options to a rule definition, producing a `Rule` the engine can
 * invoke with just an action.
 *
 * @example
 * configure(filenameCasing, { style: 'kebab-case' })
 */
export function configure<Options>(
  rule: RuleDefinition<Options>,
  options: Options,
): Rule {
  return (action) => rule({ action, options })
}

/**
 * Run rules against an action, returning the first violation as a block
 * decision or allow if none object. Rules that don't apply to the
 * action type should pass through; violations short-circuit evaluation.
 */
export function evaluate(action: Action, rules: Rule[]): Decision {
  for (const rule of rules) {
    const result = rule(action)
    if (result.kind === 'violation') {
      return { kind: 'block', reason: result.reason }
    }
  }
  return { kind: 'allow' }
}
