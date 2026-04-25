import type { Rule, RuleResult } from '../rule.js'
import { buildMatcher } from './utils/match-paths.js'

/**
 * Supported filename casing styles.
 */
export type Style = 'kebab-case' | 'camelCase' | 'snake_case'

/**
 * Blocks a write whose filename doesn't match the configured casing
 * style. When `paths` is set, only writes to matching paths are
 * checked. Path patterns follow gitignore-style semantics: globs
 * include, and a leading `!` negates (excludes) matching paths.
 * Passes non-write actions through.
 *
 * Applies to: write actions.
 * Supported agents: Claude Code. (Codex and GitHub Copilot don't
 * currently emit hook events for file writes — see PreToolUse docs.)
 *
 * @example
 * filenameCasing({ style: 'kebab-case' })
 *
 * @example
 * filenameCasing({ style: 'kebab-case', paths: ['src/**', 'test/**'] })
 */
export function filenameCasing(options: {
  style: Style
  paths?: string[]
}): Rule {
  const { style, paths } = options
  const matchesPaths = paths ? buildMatcher(paths) : () => true
  return (action) => {
    if (action.type !== 'write') return pass
    const { path } = action
    if (!matchesPaths(path)) return pass
    if (violations[style](path)) {
      return { kind: 'violation', reason: `${path} does not match ${style}` }
    }
    return pass
  }
}

const pass: RuleResult = { kind: 'pass' }

// kebab-case: no uppercase, no underscores.
const violatesKebab = (path: string): boolean => /[A-Z_]/.test(path)
// camelCase: no hyphens; no path segment may start with an uppercase
// letter. `/\/[A-Z]/` catches `src/UserProfile.ts` (segment-initial cap).
const violatesCamel = (path: string): boolean =>
  path.includes('-') || /\/[A-Z]/.test(path)
// snake_case: no uppercase anywhere.
const violatesSnake = (path: string): boolean => /[A-Z]/.test(path)

const violations = {
  'kebab-case': violatesKebab,
  camelCase: violatesCamel,
  snake_case: violatesSnake,
} satisfies Record<Style, (path: string) => boolean>
