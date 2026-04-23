import type { PreToolUseHookInput } from '@anthropic-ai/claude-agent-sdk'

import type { Decision } from '../engine'
import type { Action } from '../rule'

export function toAction(payload: PreToolUseHookInput): Action {
  if (payload.tool_name === 'Bash') {
    const { command } = payload.tool_input as { command: string }
    return { type: 'command', command }
  }
  const { file_path } = payload.tool_input as { file_path: string }
  return { type: 'write', path: file_path }
}

export function toResponse(decision: Decision): string {
  if (decision.kind === 'block') {
    return JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: decision.reason,
      },
    })
  }
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  })
}
