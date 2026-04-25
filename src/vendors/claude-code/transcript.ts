import { lstat, readFile, stat } from 'node:fs/promises'

import { z } from 'zod'

import type { SessionEvent } from '../../rule.js'

const DEFAULT_MAX_TRANSCRIPT_BYTES = 100 * 1024 * 1024

const ContentItemSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('tool_use'),
    name: z.string(),
    id: z.string(),
    input: z.unknown(),
  }),
  z.object({
    type: z.literal('tool_result'),
    content: z.string(),
    tool_use_id: z.string(),
  }),
  z.object({
    type: z.literal('text'),
    text: z.string(),
  }),
])

const EntrySchema = z.object({
  type: z.string().optional(),
  message: z.object({ content: z.array(z.unknown()) }).optional(),
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
  const lines = raw.split('\n').filter(Boolean)

  const pending = new Map<string, SessionEvent>()
  const emitted: SessionEvent[] = []

  for (const line of lines) {
    let rawEntry: unknown
    try {
      rawEntry = JSON.parse(line)
    } catch {
      continue
    }
    const entry = EntrySchema.safeParse(rawEntry)
    if (!entry.success) continue
    const content = entry.data.message?.content
    if (!content) continue
    for (const c of content) {
      const parsed = ContentItemSchema.safeParse(c)
      if (!parsed.success) continue
      const item = parsed.data
      if (item.type === 'tool_use') {
        const action: SessionEvent = {
          kind: 'action',
          tool: item.name,
          input: item.input,
          output: '',
          toolUseId: item.id,
        }
        pending.set(item.id, action)
        emitted.push(action)
      } else if (item.type === 'tool_result') {
        const existing = pending.get(item.tool_use_id)
        if (existing && existing.kind === 'action') {
          existing.output = item.content
        }
      } else if (item.type === 'text' && entry.data.type === 'user') {
        emitted.push({ kind: 'prompt', text: item.text })
      }
    }
  }
  return emitted
}
