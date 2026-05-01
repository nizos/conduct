import { homedir } from 'node:os'
import path from 'node:path'

import { z } from 'zod'

import type { Action, Decision } from '../../types.js'
import { JsonString } from '../../utils/json-string.js'
import { posixAbsolute } from '../posix-absolute.js'

const KNOWN_TOOL_NAMES = new Set(['bash', 'create', 'edit'])

const writeToolsSchema = z.discriminatedUnion('toolName', [
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
      cwd: z.string().min(1),
    })
    .transform(
      (d): Action => ({
        type: 'write',
        path: posixAbsolute(d.cwd, d.toolArgs.path),
        content: d.toolArgs.file_text,
      }),
    ),
  z
    .object({
      toolName: z.literal('edit'),
      toolArgs: JsonString.pipe(
        z.object({ path: z.string(), new_str: z.string() }),
      ),
      cwd: z.string().min(1),
    })
    .transform(
      (d): Action => ({
        type: 'write',
        path: posixAbsolute(d.cwd, d.toolArgs.path),
        content: d.toolArgs.new_str,
      }),
    ),
])

/**
 * Anything Copilot fires the hook for that we don't explicitly model
 * (view, report_intent, future tools, etc.) maps to an empty command —
 * no rule matches it, the engine returns allow, toResponse emits ''.
 * The refinement excludes known tool names so a malformed `bash` /
 * `create` / `edit` payload still falls through to the "invalid hook
 * payload" error rather than silently passing through.
 */
const passthroughSchema = z
  .object({ toolName: z.string() })
  .refine((d) => !KNOWN_TOOL_NAMES.has(d.toolName))
  .transform((): Action => ({ type: 'command', command: '' }))

export const actionSchema = z.union([writeToolsSchema, passthroughSchema])

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
  // Allow = "no opinion": empty stdout keeps Copilot's normal flow and
  // built-in confirmations intact. Today only `deny` is acted on, but
  // emitting `allow` would silently grant permission once Copilot starts
  // honoring it.
  return ''
}
