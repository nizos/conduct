import { z } from 'zod'

import type { Action, Decision } from '../../types.js'
import { posixAbsolute } from '../posix-absolute.js'

const KNOWN_TOOL_NAMES = new Set(['Bash', 'Edit', 'Write'])

const writeToolsSchema = z.discriminatedUnion('tool_name', [
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
      cwd: z.string().min(1),
    })
    .transform(
      (d): Action => ({
        type: 'write',
        path: posixAbsolute(d.cwd, d.tool_input.file_path),
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
      cwd: z.string().min(1),
    })
    .transform(
      (d): Action => ({
        type: 'write',
        path: posixAbsolute(d.cwd, d.tool_input.file_path),
        content: d.tool_input.content,
      }),
    ),
])

/**
 * Anything Claude Code fires the hook for that we don't explicitly
 * model (Read, Grep, MultiEdit, NotebookEdit, future tools) maps to an
 * empty command — no rule matches it, the engine returns allow,
 * toResponse emits ''. The refinement excludes known tool names so a
 * malformed Bash / Edit / Write payload still throws rather than
 * silently passing through.
 */
const passthroughSchema = z
  .object({ tool_name: z.string() })
  .refine((d) => !KNOWN_TOOL_NAMES.has(d.tool_name))
  .transform((): Action => ({ type: 'command', command: '' }))

export const actionSchema = z.union([writeToolsSchema, passthroughSchema])

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
  // Allow = "no opinion": empty stdout + exit 0 lets Claude Code's normal
  // permission flow take over. Returning permissionDecision: 'allow' would
  // skip the user's confirmation prompt for every non-blocked action.
  return ''
}
