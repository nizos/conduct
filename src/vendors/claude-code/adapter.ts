import { z } from 'zod'

import type { Action, Decision } from '../../rule.js'

const PayloadSchema = z.discriminatedUnion('tool_name', [
  z.object({
    tool_name: z.literal('Bash'),
    tool_input: z.object({ command: z.string() }),
  }),
  z.object({
    tool_name: z.literal('Edit'),
    tool_input: z.object({
      file_path: z.string(),
      new_string: z.string(),
    }),
  }),
  z.object({
    tool_name: z.literal('Write'),
    tool_input: z.object({
      file_path: z.string(),
      content: z.string(),
    }),
  }),
])

const ContextPayloadSchema = z.object({ transcript_path: z.string() })

export function toAction(payload: unknown): Action {
  const parsed = PayloadSchema.safeParse(payload)
  if (!parsed.success) {
    const toolName =
      typeof payload === 'object' && payload !== null && 'tool_name' in payload
        ? String((payload as { tool_name: unknown }).tool_name)
        : 'unknown'
    throw new Error(
      `unsupported tool_name or malformed tool_input: ${toolName}`,
    )
  }
  const input = parsed.data
  if (input.tool_name === 'Bash') {
    return { type: 'command', command: input.tool_input.command }
  }
  if (input.tool_name === 'Edit') {
    return {
      type: 'write',
      path: input.tool_input.file_path,
      content: input.tool_input.new_string,
    }
  }
  return {
    type: 'write',
    path: input.tool_input.file_path,
    content: input.tool_input.content,
  }
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
