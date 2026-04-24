import type { Action, Decision } from '../rule.js'

export function toAction(payload: unknown): Action {
  const { tool_input } = payload as { tool_input: { command: string } }
  return { type: 'command', command: tool_input.command }
}

export function toResponse(_decision: Decision): string {
  throw new Error('codex toResponse not implemented')
}
