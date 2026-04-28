import { z } from 'zod'

import type { Action, Decision } from '../../types.js'

export function toResponse(decision: Decision): string {
  if (decision.kind === 'block') {
    return JSON.stringify({
      permissionDecision: 'deny',
      permissionDecisionReason: decision.reason,
    })
  }
  return ''
}

export const actionSchema = z.discriminatedUnion('tool_name', [
  z
    .object({
      tool_name: z.literal('run_in_terminal'),
      tool_input: z.object({ command: z.string() }),
    })
    .transform(
      (d): Action => ({ type: 'command', command: d.tool_input.command }),
    ),
  z
    .object({
      tool_name: z.literal('create_file'),
      tool_input: z.object({ filePath: z.string(), content: z.string() }),
    })
    .transform(
      (d): Action => ({
        type: 'write',
        path: d.tool_input.filePath,
        content: d.tool_input.content,
      }),
    ),
  z
    .object({
      tool_name: z.literal('replace_string_in_file'),
      tool_input: z.object({ filePath: z.string(), newString: z.string() }),
    })
    .transform(
      (d): Action => ({
        type: 'write',
        path: d.tool_input.filePath,
        content: d.tool_input.newString,
      }),
    ),
])

const ContextPayloadSchema = z.object({ transcript_path: z.string() })

export function sessionPath(payload: unknown): string | undefined {
  const parsed = ContextPayloadSchema.safeParse(payload)
  return parsed.success ? parsed.data.transcript_path : undefined
}
