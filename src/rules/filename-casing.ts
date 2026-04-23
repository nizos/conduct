import type { Action, RuleResult } from '../rule'

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
 * configure(filenameCasing, { style: 'kebab-case' })
 */
export function filenameCasing(input: {
  action: Action
  options: { style: Style }
}): RuleResult {
  const { action } = input
  if (action.type !== 'write') return pass
  const { path } = action
  const { style } = input.options
  if (detectors[style](path)) {
    return { kind: 'violation', reason: `${path} does not match ${style}` }
  }
  return pass
}

const pass: RuleResult = { kind: 'pass' }

const violatesKebab = (path: string): boolean => /[A-Z_]/.test(path)
const violatesCamel = (path: string): boolean =>
  path.includes('-') || /\/[A-Z]/.test(path)
const violatesSnake = (path: string): boolean => /[A-Z]/.test(path)

const detectors = {
  'kebab-case': violatesKebab,
  camelCase: violatesCamel,
  snake_case: violatesSnake,
} satisfies Record<Style, (path: string) => boolean>
