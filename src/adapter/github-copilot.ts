import type { Decision } from '../engine.js'
import type { Action } from '../rule.js'

export function toAction(payload: unknown): Action {
  const { toolArgs } = payload as { toolArgs: string }
  const { command } = JSON.parse(toolArgs) as { command: string }
  return { type: 'command', command }
}

export function toResponse(_decision: Decision): string {
  throw new Error('github-copilot toResponse not implemented')
}
