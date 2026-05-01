import { z } from 'zod'

import type { Action, Decision } from '../../types.js'
import { posixAbsolute } from '../posix-absolute.js'

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
  return ''
}

const writeToolsSchema = z.discriminatedUnion('tool_name', [
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
      cwd: z.string().min(1),
    })
    .transform(
      (d): Action => ({
        type: 'write',
        path: posixAbsolute(d.cwd, d.tool_input.filePath),
        content: d.tool_input.content,
      }),
    ),
  z
    .object({
      tool_name: z.literal('replace_string_in_file'),
      tool_input: z.object({ filePath: z.string(), newString: z.string() }),
      cwd: z.string().min(1),
    })
    .transform(
      (d): Action => ({
        type: 'write',
        path: posixAbsolute(d.cwd, d.tool_input.filePath),
        content: d.tool_input.newString,
      }),
    ),
])

const KNOWN_TOOL_NAMES = new Set([
  'run_in_terminal',
  'create_file',
  'replace_string_in_file',
])

/**
 * Anything we don't explicitly recognise (read_file, list_dir,
 * grep_search, future tools, etc.) maps to an empty command — no rule
 * matches it, the engine returns allow, and toResponse emits ''. The
 * Chat extension fires the hook for every tool call, so silently
 * passing through unknown tools is what keeps the surface usable.
 * Known tool names are excluded so a malformed run_in_terminal /
 * create_file / replace_string_in_file payload throws rather than
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
