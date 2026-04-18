import type { PreToolUseHookInput } from '@anthropic-ai/claude-agent-sdk'

export function toAction(payload: PreToolUseHookInput): {
  type: 'write'
  path: string
} {
  const { file_path } = payload.tool_input as { file_path: string }
  return { type: 'write', path: file_path }
}
