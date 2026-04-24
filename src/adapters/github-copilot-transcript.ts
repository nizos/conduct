import { lstat, readFile, stat } from 'node:fs/promises'

import { z } from 'zod'

import type { SessionEvent } from '../rule.js'

const DEFAULT_MAX_TRANSCRIPT_BYTES = 100 * 1024 * 1024

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
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_TRANSCRIPT_BYTES
  const linkInfo = await lstat(path)
  if (linkInfo.isSymbolicLink()) {
    throw new Error(`transcript at ${path} is a symbolic link (refusing)`)
  }
  const info = await stat(path)
  if (info.size > maxBytes) {
    throw new Error(
      `transcript at ${path} exceeds ${maxBytes} bytes (got ${info.size})`,
    )
  }
  const raw = await readFile(path, 'utf8')
  const pending = new Map<string, SessionEvent>()
  const emitted: SessionEvent[] = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    let rawEntry: unknown
    try {
      rawEntry = JSON.parse(line)
    } catch {
      continue
    }
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
