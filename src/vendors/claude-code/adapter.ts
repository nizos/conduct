import { z } from 'zod'

import type { Action, Decision } from '../../rule.js'

const ActionSchema = z.discriminatedUnion('tool_name', [
  z
    .object({
      tool_name: z.literal('Bash'),
      tool_input: z.object({ command: z.string() }),
    })
    .transform(
      (d): Action => ({ type: 'command', command: d.tool_input.command }),
    ),
  z
    .object({
      tool_name: z.literal('Edit'),
      tool_input: z.object({
        file_path: z.string(),
        new_string: z.string(),
      }),
    })
    .transform(
      (d): Action => ({
        type: 'write',
        path: d.tool_input.file_path,
        content: d.tool_input.new_string,
      }),
    ),
  z
    .object({
      tool_name: z.literal('Write'),
      tool_input: z.object({
        file_path: z.string(),
        content: z.string(),
      }),
    })
    .transform(
      (d): Action => ({
        type: 'write',
        path: d.tool_input.file_path,
        content: d.tool_input.content,
      }),
    ),
])

const ContextPayloadSchema = z.object({ transcript_path: z.string() })

export function toAction(payload: unknown): Action {
  const parsed = ActionSchema.safeParse(payload)
  if (parsed.success) return parsed.data
  const toolName =
    typeof payload === 'object' && payload !== null && 'tool_name' in payload
      ? String((payload as { tool_name: unknown }).tool_name)
      : 'unknown'
  throw new Error(`unsupported tool_name or malformed tool_input: ${toolName}`)
}

export function sessionPath(payload: unknown): string | undefined {
  const parsed = ContextPayloadSchema.safeParse(payload)
  return parsed.success ? parsed.data.transcript_path : undefined
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
