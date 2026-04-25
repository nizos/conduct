import { z } from 'zod'

import type { SessionEvent } from '../../types.js'
import { readJsonl } from '../../utils/read-jsonl.js'

const UserMessageSchema = z.object({
  type: z.literal('user.message'),
  data: z.object({ content: z.string() }),
})

const ToolStartSchema = z.object({
  type: z.literal('tool.execution_start'),
  data: z.object({
    toolCallId: z.string(),
    toolName: z.string(),
    arguments: z.unknown(),
  }),
})

const ToolCompleteSchema = z.object({
  type: z.literal('tool.execution_complete'),
  data: z.object({
    toolCallId: z.string(),
    result: z
      .object({
        content: z.string().optional(),
        detailedContent: z.string().optional(),
      })
      .optional(),
  }),
})

export async function readTranscript(
  path: string,
  options: { maxBytes?: number } = {},
): Promise<SessionEvent[]> {
  const entries = await readJsonl(path, options)
  const pending = new Map<string, SessionEvent>()
  const emitted: SessionEvent[] = []
  for (const rawEntry of entries) {
    const user = UserMessageSchema.safeParse(rawEntry)
    if (user.success) {
      emitted.push({ kind: 'prompt', text: user.data.data.content })
      continue
    }
    const start = ToolStartSchema.safeParse(rawEntry)
    if (start.success) {
      const action: SessionEvent = {
        kind: 'action',
        tool: start.data.data.toolName,
        input: start.data.data.arguments,
        output: '',
        toolUseId: start.data.data.toolCallId,
      }
      pending.set(start.data.data.toolCallId, action)
      emitted.push(action)
      continue
    }
    const complete = ToolCompleteSchema.safeParse(rawEntry)
    if (complete.success) {
      const existing = pending.get(complete.data.data.toolCallId)
      if (existing && existing.kind === 'action') {
        existing.output =
          complete.data.data.result?.content ??
          complete.data.data.result?.detailedContent ??
          ''
      }
    }
  }
  return emitted
}
