import type { RawSessionEvent, SessionEvent } from '../../types.js'

export function toCanonical(event: RawSessionEvent): SessionEvent {
  if (event.kind === 'prompt') return event
  if (event.tool === 'create') {
    const input = event.input as { path: string; file_text: string }
    return {
      kind: 'write',
      path: input.path,
      content: input.file_text,
      output: event.output,
    }
  }
  if (event.tool === 'bash') {
    const input = event.input as { command: string }
    return { kind: 'command', command: input.command, output: event.output }
  }
  return {
    kind: 'other',
    tool: event.tool,
    input: event.input,
    output: event.output,
  }
}
