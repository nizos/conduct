import { z } from 'zod'

import type { Action, Decision } from '../../rule.js'

const PayloadSchema = z.object({
  tool_name: z.literal('Bash'),
  tool_input: z.object({ command: z.string() }),
})

const ContextPayloadSchema = z.object({ transcript_path: z.string() })

export function toAction(payload: unknown): Action {
  const parsed = PayloadSchema.safeParse(payload)
  if (!parsed.success) {
    const toolName =
      typeof payload === 'object' && payload !== null && 'tool_name' in payload
        ? String((payload as { tool_name: unknown }).tool_name)
        : 'unknown'
    throw new Error(
      `unsupported codex tool_name or malformed tool_input: ${toolName}`,
    )
  }
  return { type: 'command', command: parsed.data.tool_input.command }
}

export function sessionPath(payload: unknown): string | undefined {
  const parsed = ContextPayloadSchema.safeParse(payload)
  return parsed.success ? parsed.data.transcript_path : undefined
}

export function toResponse(decision: Decision): string {
  if (decision.kind === 'block') {
    return JSON.stringify({ decision: 'block', reason: decision.reason })
  }
  return ''
}
