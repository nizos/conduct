import type { PreToolUseHookInput } from '@anthropic-ai/claude-agent-sdk'

import type { Action, AiClient, Decision } from '../rule.js'
import { readTranscript } from './claude-code-transcript.js'

export function toAction(payload: unknown): Action {
  const input = payload as PreToolUseHookInput
  if (input.tool_name === 'Bash') {
    const { command } = input.tool_input as { command: string }
    return { type: 'command', command }
  }
  if (input.tool_name === 'Edit') {
    const { file_path, new_string } = input.tool_input as {
      file_path: string
      new_string: string
    }
    return { type: 'write', path: file_path, content: new_string }
  }
  const { file_path, content } = input.tool_input as {
    file_path: string
    content: string
  }
  return { type: 'write', path: file_path, content }
}

export function buildContext(
  payload: unknown,
  options: { ai?: AiClient } = {},
) {
  const input = payload as { transcript_path: string }
  return {
    history: () => readTranscript(input.transcript_path),
    ai: options.ai,
  }
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
