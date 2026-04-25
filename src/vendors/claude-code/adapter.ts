import { z } from 'zod'

import type { Action, Decision } from '../../types.js'

export const actionSchema = z.discriminatedUnion('tool_name', [
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
