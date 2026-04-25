import { homedir } from 'node:os'
import path from 'node:path'

import { z } from 'zod'

import type { Action, Decision } from '../rule.js'
import { readTranscript } from '../transcripts/github-copilot.js'

const PayloadSchema = z.discriminatedUnion('toolName', [
  z.object({ toolName: z.literal('bash'), toolArgs: z.string() }),
  z.object({ toolName: z.literal('create'), toolArgs: z.string() }),
  z.object({ toolName: z.literal('edit'), toolArgs: z.string() }),
])

const BashArgsSchema = z.object({ command: z.string() })
const CreateArgsSchema = z.object({
  path: z.string(),
  file_text: z.string(),
})
const EditArgsSchema = z.object({
  path: z.string(),
  new_str: z.string(),
})

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
  if (parsed.data.toolName === 'create') {
    const args = CreateArgsSchema.safeParse(rawArgs)
    if (!args.success) {
      throw new Error(
        'github-copilot create toolArgs missing required "path" or "file_text"',
      )
    }
    return { type: 'write', path: args.data.path, content: args.data.file_text }
  }
  if (parsed.data.toolName === 'edit') {
    const args = EditArgsSchema.safeParse(rawArgs)
    if (!args.success) {
      throw new Error(
        'github-copilot edit toolArgs missing required "path" or "new_str"',
      )
    }
    return { type: 'write', path: args.data.path, content: args.data.new_str }
  }
  const args = BashArgsSchema.safeParse(rawArgs)
  if (!args.success) {
    throw new Error('github-copilot bash toolArgs missing required "command"')
  }
  return { type: 'command', command: args.data.command }
}

const ContextPayloadSchema = z.object({
  sessionId: z.string().regex(/^[A-Za-z0-9_-]+$/, {
    message: 'sessionId must be a safe identifier (no path separators)',
  }),
})

export function buildContext(payload: unknown): Record<string, unknown> {
  const { sessionId } = ContextPayloadSchema.parse(payload)
  const home = process.env.COPILOT_HOME ?? path.join(homedir(), '.copilot')
  const events = path.join(home, 'session-state', sessionId, 'events.jsonl')
  return { history: () => readTranscript(events) }
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
