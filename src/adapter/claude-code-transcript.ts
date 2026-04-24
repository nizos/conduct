import { readFile } from 'node:fs/promises'

export async function readTranscript(path: string): Promise<unknown[]> {
  const raw = await readFile(path, 'utf8')
  const lines = raw.split('\n').filter(Boolean)
  const uses = new Map<string, { name: string; input: unknown }>()
  const results = new Map<string, string>()

  for (const line of lines) {
    const entry = JSON.parse(line) as {
      message?: { content?: unknown }
    }
    const content = entry.message?.content
    if (!Array.isArray(content)) continue
    for (const c of content as Array<Record<string, unknown>>) {
      if (c.type === 'tool_use') {
        uses.set(c.id as string, { name: c.name as string, input: c.input })
      } else if (c.type === 'tool_result' && typeof c.content === 'string') {
        results.set(c.tool_use_id as string, c.content)
      }
    }
  }

  const events: unknown[] = []
  for (const [id, use] of uses) {
    events.push({
      kind: 'action',
      tool: use.name,
      input: use.input,
      output: results.get(id) ?? '',
      toolUseId: id,
    })
  }
  return events
}
