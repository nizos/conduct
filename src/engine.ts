import type { Action, Rule } from './rule.js'

/**
 * The engine's decision after evaluating rules against an action.
 *
 * - `allow` — no rule objected; the action may proceed.
 * - `block` — a rule objected; `reason` is surfaced back to the agent
 *   via its adapter's response format.
 */
export type Decision = { kind: 'allow' } | { kind: 'block'; reason: string }

/**
 * Run rules against an action, returning the first violation as a block
 * decision or allow if none object. Rules that don't apply to the
 * action type should pass through; violations short-circuit evaluation.
 */
export async function evaluate(
  action: Action,
  rules: Rule[],
): Promise<Decision> {
  for (const rule of rules) {
    const result = await rule(action)
    if (result.kind === 'violation') {
      return { kind: 'block', reason: result.reason }
    }
  }
  return { kind: 'allow' }
}
