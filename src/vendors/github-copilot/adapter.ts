import { homedir } from 'node:os'
import path from 'node:path'

import { z } from 'zod'

import type { Action, Decision } from '../../rule.js'

const JsonString = z.string().transform((s, ctx): unknown => {
  try {
    return JSON.parse(s)
  } catch {
    ctx.addIssue({ code: 'custom', message: 'toolArgs is not valid JSON' })
    return z.NEVER
  }
})

const ActionSchema = z.discriminatedUnion('toolName', [
  z
    .object({
      toolName: z.literal('bash'),
      toolArgs: JsonString.pipe(z.object({ command: z.string() })),
    })
    .transform(
      (d): Action => ({ type: 'command', command: d.toolArgs.command }),
    ),
  z
    .object({
      toolName: z.literal('create'),
      toolArgs: JsonString.pipe(
        z.object({ path: z.string(), file_text: z.string() }),
      ),
    })
    .transform(
      (d): Action => ({
        type: 'write',
        path: d.toolArgs.path,
        content: d.toolArgs.file_text,
      }),
    ),
  z
    .object({
      toolName: z.literal('edit'),
      toolArgs: JsonString.pipe(
        z.object({ path: z.string(), new_str: z.string() }),
      ),
    })
    .transform(
      (d): Action => ({
        type: 'write',
        path: d.toolArgs.path,
        content: d.toolArgs.new_str,
      }),
    ),
])

export function toAction(payload: unknown): Action {
  const parsed = ActionSchema.safeParse(payload)
  if (parsed.success) return parsed.data
  const toolName =
    typeof payload === 'object' && payload !== null && 'toolName' in payload
      ? String((payload as { toolName: unknown }).toolName)
      : 'unknown'
  throw new Error(
    `unsupported github-copilot toolName or malformed payload: ${toolName}`,
  )
}

const ContextPayloadSchema = z.object({
  sessionId: z.string().regex(/^[A-Za-z0-9_-]+$/, {
    message: 'sessionId must be a safe identifier (no path separators)',
  }),
})

export function sessionPath(payload: unknown): string | undefined {
  const parsed = ContextPayloadSchema.safeParse(payload)
  if (!parsed.success) return undefined
  const home = process.env.COPILOT_HOME ?? path.join(homedir(), '.copilot')
  return path.join(home, 'session-state', parsed.data.sessionId, 'events.jsonl')
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
