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

/**
 * Fail-closed wrapper around {@link evaluate}. A rule that throws
 * becomes a block decision with the error message, rather than
 * escaping as an unhandled rejection. The CLI dispatch pipeline uses
 * this so a buggy rule cannot crash the hook.
 */
export async function evaluateSafely(
  action: Action,
  rules: Rule[],
  ctx?: unknown,
): Promise<Decision> {
  try {
    return await evaluate(action, rules, ctx)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { kind: 'block', reason: `rule error: ${reason}` }
  }
}
