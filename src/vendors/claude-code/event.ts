import type { RawSessionEvent, SessionEvent } from '../../types.js'

export function toCanonical(event: RawSessionEvent): SessionEvent {
  if (event.kind === 'prompt') return event
  if (event.tool === 'Bash') {
    const input = event.input as { command: string }
    return { kind: 'command', command: input.command, output: event.output }
  }
  if (event.tool === 'Write') {
    const input = event.input as { file_path: string; content: string }
    return {
      kind: 'write',
      path: input.file_path,
      content: input.content,
      output: event.output,
    }
  }
  if (event.tool === 'Edit') {
    const input = event.input as { file_path: string; new_string: string }
    return {
      kind: 'write',
      path: input.file_path,
      content: input.new_string,
      output: event.output,
    }
  }
  return {
    kind: 'other',
    tool: event.tool,
    input: event.input,
    output: event.output,
  }
}
