import { readFile } from 'node:fs/promises'

export async function readTranscript(path: string): Promise<unknown[]> {
  const raw = await readFile(path, 'utf8')
  const lines = raw.split('\n').filter(Boolean)
  const uses = new Map<string, { name: string; input: unknown }>()
  const results = new Map<string, string>()
  const prompts: string[] = []

  for (const line of lines) {
    const entry = JSON.parse(line) as {
      type?: string
      message?: { content?: unknown }
    }
    const content = entry.message?.content
    if (!Array.isArray(content)) continue
    for (const c of content as Array<Record<string, unknown>>) {
      if (c.type === 'tool_use') {
        uses.set(c.id as string, { name: c.name as string, input: c.input })
      } else if (c.type === 'tool_result' && typeof c.content === 'string') {
        results.set(c.tool_use_id as string, c.content)
      } else if (
        c.type === 'text' &&
        entry.type === 'user' &&
        typeof c.text === 'string'
      ) {
        prompts.push(c.text)
      }
    }
  }

  const events: unknown[] = []
  for (const text of prompts) {
    events.push({ kind: 'prompt', text })
  }
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
