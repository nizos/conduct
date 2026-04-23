import type { Action, RuleResult } from '../rule'

/**
 * Blocks a command whose text contains the configured literal match.
 * Passes non-command actions and non-matching commands through.
 *
 * Applies to: command actions (bash / shell tool calls).
 * Supported agents: Claude Code, Codex, GitHub Copilot.
 *
 * @example
 * configure(forbidCommandPattern, {
 *   match: 'npm install',
 *   reason: 'Use pnpm install instead',
 * })
 */
export function forbidCommandPattern(input: {
  action: Action
  options: { match: string; reason: string }
}): RuleResult {
  const { action, options } = input
  if (action.type === 'command' && action.command.includes(options.match)) {
    return { kind: 'violation', reason: options.reason }
  }
  return { kind: 'pass' }
}
