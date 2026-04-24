import { z } from 'zod'

import type { Action, Decision } from '../rule.js'

const PayloadSchema = z.object({
  toolName: z.literal('bash'),
  toolArgs: z.string(),
})

const BashArgsSchema = z.object({ command: z.string() })

export function toAction(payload: unknown): Action {
  const parsed = PayloadSchema.safeParse(payload)
  if (!parsed.success) {
    const toolName =
      typeof payload === 'object' && payload !== null && 'toolName' in payload
        ? String((payload as { toolName: unknown }).toolName)
        : 'unknown'
    throw new Error(
      `unsupported github-copilot toolName or malformed payload: ${toolName}`,
    )
  }
  let rawArgs: unknown
  try {
    rawArgs = JSON.parse(parsed.data.toolArgs)
  } catch {
    throw new Error(
      `github-copilot toolArgs is not valid JSON: ${parsed.data.toolArgs.slice(0, 80)}`,
    )
  }
  const args = BashArgsSchema.safeParse(rawArgs)
  if (!args.success) {
    throw new Error('github-copilot bash toolArgs missing required "command"')
  }
  return { type: 'command', command: args.data.command }
}

export function toResponse(decision: Decision): string {
  if (decision.kind === 'block') {
    return JSON.stringify({
      permissionDecision: 'deny',
      permissionDecisionReason: decision.reason,
    })
  }
  // Per docs, only `deny` is currently processed by the CLI; `allow`
  // is emitted for compliance but doesn't bypass built-in confirmations.
  return JSON.stringify({ permissionDecision: 'allow' })
}
