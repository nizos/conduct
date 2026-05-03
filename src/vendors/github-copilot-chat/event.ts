import type { RawSessionEvent, SessionEvent } from '../../types.js'

export function toCanonical(event: RawSessionEvent): SessionEvent {
  if (event.kind === 'prompt') return event
  if (event.tool === 'create_file') {
    const input = event.input as { filePath: string; content: string }
    return {
      kind: 'write',
      path: input.filePath,
      content: input.content,
      output: event.output,
    }
  }
  if (event.tool === 'run_in_terminal') {
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
