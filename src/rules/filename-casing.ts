import type { Rule, RuleResult } from '../rule.js'

/**
 * Supported filename casing styles.
 */
export type Style = 'kebab-case' | 'camelCase' | 'snake_case'

/**
 * Blocks a write whose filename doesn't match the configured casing
 * style. Passes non-write actions through.
 *
 * Applies to: write actions.
 * Supported agents: Claude Code. (Codex and GitHub Copilot don't
 * currently emit hook events for file writes — see PreToolUse docs.)
 *
 * @example
 * filenameCasing({ style: 'kebab-case' })
 */
export function filenameCasing(options: { style: Style }): Rule {
  const { style } = options
  return (action) => {
    if (action.type !== 'write') return pass
    const { path } = action
    if (violations[style](path)) {
      return { kind: 'violation', reason: `${path} does not match ${style}` }
    }
    return pass
  }
}

const pass: RuleResult = { kind: 'pass' }

const violatesKebab = (path: string): boolean => /[A-Z_]/.test(path)
const violatesCamel = (path: string): boolean =>
  path.includes('-') || /\/[A-Z]/.test(path)
const violatesSnake = (path: string): boolean => /[A-Z]/.test(path)

const violations = {
  'kebab-case': violatesKebab,
  camelCase: violatesCamel,
  snake_case: violatesSnake,
} satisfies Record<Style, (path: string) => boolean>
