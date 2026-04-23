import type { Action } from '../rule'

export function toAction(payload: unknown): Action {
  const { toolArgs } = payload as { toolArgs: string }
  const { command } = JSON.parse(toolArgs) as { command: string }
  return { type: 'command', command }
}
