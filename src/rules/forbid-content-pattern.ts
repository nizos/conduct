import picomatch from 'picomatch'

import type { Action, RuleResult } from '../rule'

export function forbidContentPattern(input: {
  action: Action
  options: { paths?: string[]; match: string; reason: string }
}): RuleResult {
  const { action, options } = input
  if (action.type !== 'write') return { kind: 'pass' }
  if (options.paths && !pathMatches(action.path, options.paths)) {
    return { kind: 'pass' }
  }
  if (!action.content.includes(options.match)) return { kind: 'pass' }
  return { kind: 'violation', reason: options.reason }
}

function pathMatches(path: string, patterns: string[]): boolean {
  const includes = patterns.filter((p) => !p.startsWith('!'))
  const ignore = patterns
    .filter((p) => p.startsWith('!'))
    .map((p) => p.slice(1))
  const matcher = picomatch(includes.length ? includes : '**', { ignore })
  return matcher(path)
}
