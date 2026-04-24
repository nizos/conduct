import { readFile } from 'node:fs/promises'

import type { SessionEvent } from '../rule.js'

export async function readTranscript(path: string): Promise<SessionEvent[]> {
  const raw = await readFile(path, 'utf8')
  const lines = raw.split('\n').filter(Boolean)

  const pending = new Map<string, SessionEvent>()
  const emitted: SessionEvent[] = []

  for (const line of lines) {
    let entry: { type?: string; message?: { content?: unknown } }
    try {
      entry = JSON.parse(line) as typeof entry
    } catch {
      continue
    }
    const content = entry.message?.content
    if (!Array.isArray(content)) continue
    for (const c of content) {
      if (!isRecord(c)) continue
      if (
        c.type === 'tool_use' &&
        typeof c.name === 'string' &&
        typeof c.id === 'string'
      ) {
        const action: SessionEvent = {
          kind: 'action',
          tool: c.name,
          input: c.input,
          output: '',
          toolUseId: c.id,
        }
        pending.set(c.id, action)
        emitted.push(action)
      } else if (
        c.type === 'tool_result' &&
        typeof c.content === 'string' &&
        typeof c.tool_use_id === 'string'
      ) {
        const existing = pending.get(c.tool_use_id)
        if (existing && existing.kind === 'action') existing.output = c.content
      } else if (
        c.type === 'text' &&
        entry.type === 'user' &&
        typeof c.text === 'string'
      ) {
        emitted.push({ kind: 'prompt', text: c.text })
      }
    }
  }
  return emitted
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
