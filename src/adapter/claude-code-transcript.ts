import { readFile } from 'node:fs/promises'

export async function readTranscript(path: string): Promise<unknown[]> {
  const raw = await readFile(path, 'utf8')
  const lines = raw.split('\n').filter(Boolean)

  type Emit =
    | { kind: 'prompt'; text: string }
    | {
        kind: 'action'
        tool: string
        input: unknown
        output: string
        toolUseId: string
      }

  const pending = new Map<string, Emit>()
  const emitted: Emit[] = []

  for (const line of lines) {
    const entry = JSON.parse(line) as {
      type?: string
      message?: { content?: unknown }
    }
    const content = entry.message?.content
    if (!Array.isArray(content)) continue
    for (const c of content as Array<Record<string, unknown>>) {
      if (c.type === 'tool_use') {
        const action: Emit = {
          kind: 'action',
          tool: c.name as string,
          input: c.input,
          output: '',
          toolUseId: c.id as string,
        }
        pending.set(c.id as string, action)
        emitted.push(action)
      } else if (c.type === 'tool_result' && typeof c.content === 'string') {
        const existing = pending.get(c.tool_use_id as string)
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
