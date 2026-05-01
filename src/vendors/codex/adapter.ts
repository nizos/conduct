import { z } from 'zod'

import type { Action, Decision } from '../../types.js'
import { relativizePath } from '../relativize-path.js'

const PATCH_HEADER = /^\*\*\* (?:Add|Update|Delete) File: (.+)$/m

const KNOWN_TOOL_NAMES = new Set(['Bash', 'apply_patch'])

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
      tool_name: z.literal('apply_patch'),
      tool_input: z.object({ command: z.string() }),
      cwd: z.string().min(1),
    })
    .transform((d, ctx): Action => {
      const path = PATCH_HEADER.exec(d.tool_input.command)?.[1]
      if (!path) {
        ctx.addIssue({
          code: 'custom',
          message: 'apply_patch: no Add/Update/Delete File header',
        })
        return z.NEVER
      }
      return {
        type: 'write',
        path: relativizePath(d.cwd, path),
        content: d.tool_input.command,
      }
    }),
])

/**
 * Anything Codex fires the hook for that we don't explicitly model
 * (future tools, or a broader user matcher than the recommended
 * `^(Bash|apply_patch|Edit|Write)$`) maps to an empty command — no
 * rule matches it, the engine returns allow, toResponse emits ''. The
 * refinement excludes known tool names so a malformed Bash /
 * apply_patch payload still throws rather than silently passing
 * through.
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
    return JSON.stringify({ decision: 'block', reason: decision.reason })
  }
  return ''
}
