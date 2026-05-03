import { readFile } from 'node:fs/promises'

import type { PreToolUseHookSpecificOutput } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'

import type { Action, Decision } from '../../types.js'
import { fromSchema, passthroughFor } from '../adapter.js'
import { posixAbsolute } from '../posix-absolute.js'

/**
 * The JSON shape `toResponse` emits on a block decision. Tests parsing
 * the response stream against this canonical shape catch drift if the
 * adapter ever changes its output.
 */
export type ResponseShape = {
  hookSpecificOutput: PreToolUseHookSpecificOutput
}

const writeToolsSchema = z.discriminatedUnion('tool_name', [
  z
    .object({
      tool_name: z.literal('Bash'),
      tool_input: z.object({ command: z.string() }),
    })
    .transform(
      (d): Action => ({ kind: 'command', command: d.tool_input.command }),
    ),
  z
    .object({
      tool_name: z.literal('Edit'),
      tool_input: z.object({
        file_path: z.string(),
        old_string: z.string(),
        new_string: z.string(),
      }),
      cwd: z.string().min(1),
    })
    .transform(async (d): Promise<Action> => {
      const path = posixAbsolute(d.cwd, d.tool_input.file_path)
      const content = await computeEditedContent(
        path,
        d.tool_input.old_string,
        d.tool_input.new_string,
      )
      return { kind: 'write', path, content }
    }),
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
        kind: 'write',
        path: posixAbsolute(d.cwd, d.tool_input.file_path),
        content: d.tool_input.content,
      }),
    ),
])

// Anything Claude Code fires the hook for that we don't explicitly
// model (Read, Grep, MultiEdit, NotebookEdit, future tools) becomes a
// no-op command — no rule matches it, the engine returns allow.
// `passthroughFor` excludes the known tool names so a malformed
// Bash / Edit / Write payload still surfaces as a parse error rather
// than silently passing through.
const passthroughSchema = passthroughFor('tool_name', ['Bash', 'Edit', 'Write'])

export const parseAction = fromSchema(
  z.union([writeToolsSchema, passthroughSchema]),
)

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

// Reads the current file and applies the Edit substitution so the
// canonical Action carries the full post-edit content. If the file
// can't be read (missing, unreadable), falls back to the new_string
// alone — preserves the previous "partial content" behaviour as a
// graceful degradation rather than a parse failure.
async function computeEditedContent(
  filePath: string,
  oldString: string,
  newString: string,
): Promise<string> {
  try {
    const current = await readFile(filePath, 'utf8')
    return current.replace(oldString, newString)
  } catch {
    return newString
  }
}
