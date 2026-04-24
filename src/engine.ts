import type { Action, Decision, Rule } from './rule.js'

/**
 * Run rules against an action, returning the first violation as a block
 * decision or allow if none object. Rules that don't apply to the
 * action type should pass through; violations short-circuit evaluation.
 */
export async function evaluate(
  action: Action,
  rules: Rule[],
  ctx?: unknown,
): Promise<Decision> {
  for (const rule of rules) {
    const result = await rule(action, ctx)
    if (result.kind === 'violation') {
      return { kind: 'block', reason: result.reason }
    }
  }
  return { kind: 'allow' }
}
