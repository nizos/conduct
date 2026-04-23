import picomatch from 'picomatch'

import type { Rule } from '../rule.js'

/**
 * Blocks a write whose content matches `match` — a literal substring or
 * a RegExp. When `paths` is set, only writes to matching paths are
 * checked. Path patterns follow gitignore-style semantics: globs
 * include, and a leading `!` negates (excludes) matching paths.
 *
 * Applies to: write actions.
 * Supported agents: Claude Code. (Codex and GitHub Copilot don't
 * currently emit hook events for file writes — see PreToolUse docs.)
 *
 * @example
 * forbidContentPattern({
 *   paths: ['src/**', '!src/**\/*.test.ts'],
 *   match: 'setTimeout',
 *   reason: 'Avoid timers in production code',
 * })
 *
 * @example
 * forbidContentPattern({
 *   paths: ['**\/*.md'],
 *   match: /\p{Extended_Pictographic}/u,
 *   reason: 'No emojis in markdown',
 * })
 */
export function forbidContentPattern(options: {
  paths?: string[]
  match: string | RegExp
  reason: string
}): Rule {
  return (action) => {
    if (action.type !== 'write') return { kind: 'pass' }
    if (options.paths && !pathMatches(action.path, options.paths)) {
      return { kind: 'pass' }
    }
    if (!contentMatches(action.content, options.match)) return { kind: 'pass' }
    return { kind: 'violation', reason: options.reason }
  }
}

function contentMatches(content: string, match: string | RegExp): boolean {
  if (typeof match === 'string') return content.includes(match)
  return content.search(match) !== -1
}

function pathMatches(path: string, patterns: string[]): boolean {
  const includes = patterns.filter((p) => !p.startsWith('!'))
  const ignore = patterns
    .filter((p) => p.startsWith('!'))
    .map((p) => p.slice(1))
  const matcher = picomatch(includes.length ? includes : '**', { ignore })
  return matcher(path)
}
