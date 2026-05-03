import type { SessionEvent } from '../types.js'
import type { Rule } from './contract.js'
import { stringOrRegexMatches } from './utils/string-or-regex-matches.js'

export function requireCommand(options: {
  before: { kind: 'command'; match: string | RegExp }
  command: string | RegExp
  after?: { kind: 'write' } | { kind: 'command'; match?: string | RegExp }
  reason?: string
}): Rule {
  return async (action, ctx) => {
    if (action.kind !== options.before.kind) return { kind: 'pass' }
    if (!stringOrRegexMatches(action.command, options.before.match)) {
      return { kind: 'pass' }
    }
    const history = (await ctx?.history?.()) ?? []
    const violation = {
      kind: 'violation' as const,
      reason:
        options.reason ??
        `requireCommand: required prior command pattern ${formatMatch(
          options.command,
        )} did not satisfy the gate before this action.`,
    }
    if (options.after) {
      const lastIdx = lastIndexMatching(history, options.command)
      if (lastIdx === -1) return violation
      const after = options.after
      for (let i = lastIdx + 1; i < history.length; i++) {
        const e = history[i]
        if (!e || e.kind !== after.kind) continue
        if (
          after.kind === 'command' &&
          after.match !== undefined &&
          e.kind === 'command' &&
          !stringOrRegexMatches(e.command, after.match)
        ) {
          continue
        }
        return violation
      }
      return { kind: 'pass' }
    }
    const last = history[history.length - 1]
    if (
      last?.kind === 'command' &&
      stringOrRegexMatches(last.command, options.command)
    ) {
      return { kind: 'pass' }
    }
    return violation
  }
}

function lastIndexMatching(
  history: readonly SessionEvent[],
  match: string | RegExp,
): number {
  for (let i = history.length - 1; i >= 0; i--) {
    const e = history[i]
    if (e?.kind === 'command' && stringOrRegexMatches(e.command, match)) {
      return i
    }
  }
  return -1
}

function formatMatch(match: string | RegExp): string {
  return typeof match === 'string' ? `"${match}"` : match.toString()
}
