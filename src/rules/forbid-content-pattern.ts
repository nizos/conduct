import type { Rule } from '../rule.js'
import { buildMatcher } from './match-paths.js'
import { stringOrRegexMatches } from './string-or-regex-matches.js'

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
 *   match: 'setTimeout',
 *   reason: 'Avoid timers in production code',
 *   paths: ['src/**', '!src/**\/*.test.ts'],
 * })
 *
 * @example
 * forbidContentPattern({
 *   match: /\p{Extended_Pictographic}/u,
 *   reason: 'No emojis in markdown',
 *   paths: ['**\/*.md'],
 * })
 */
export function forbidContentPattern(options: {
  match: string | RegExp
  reason: string
  paths?: string[]
}): Rule {
  const matchesPaths = options.paths ? buildMatcher(options.paths) : () => true
  return (action) => {
    if (action.type !== 'write') return { kind: 'pass' }
    if (!matchesPaths(action.path)) return { kind: 'pass' }
    if (!stringOrRegexMatches(action.content, options.match)) {
      return { kind: 'pass' }
    }
    return { kind: 'violation', reason: options.reason }
  }
}
