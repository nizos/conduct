import type { RuleEntry } from './config.js'
import type { Action, Decision } from './types.js'
import type { Rule, RuleContext } from './rules/contract.js'
import { buildMatcher } from './rules/utils/match-paths.js'

/**
 * Run rules against an action, returning the first violation as a block
 * decision or allow if none object. Fail-closed: a rule that throws
 * becomes a block decision with the error message rather than escaping
 * as an unhandled rejection. Entries may be flat rules or
 * `{ files, rules }` blocks; blocks whose `files` glob doesn't match
 * the action's path are skipped.
 */
export async function evaluate(
  action: Action,
  entries: readonly RuleEntry[],
  ctx?: RuleContext,
): Promise<Decision> {
  try {
    for (const entry of entries) {
      for (const rule of resolveRules(entry, action)) {
        const result = await rule(action, ctx)
        if (result.kind === 'violation') {
          return { kind: 'block', reason: result.reason }
        }
      }
    }
    return { kind: 'allow' }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { kind: 'block', reason: `rule error: ${reason}` }
  }
}

function resolveRules(entry: RuleEntry, action: Action): readonly Rule[] {
  if (typeof entry === 'function') return [entry]
  if (entry.files) {
    if (
      action.kind === 'write' &&
      !buildMatcher([...entry.files])(action.path)
    ) {
      return []
    }
  }
  return entry.rules
}
