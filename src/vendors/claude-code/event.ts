import type { RawSessionEvent, SessionEvent } from '../../types.js'

export function toCanonical(event: RawSessionEvent): SessionEvent {
  if (event.kind === 'prompt') return event
  switch (event.tool) {
    case 'Bash': {
      const { command } = event.input as { command: string }
      return { kind: 'command', command, output: event.output }
    }
    case 'Write': {
      const { file_path, content } = event.input as {
        file_path: string
        content: string
      }
      return { kind: 'write', path: file_path, content, output: event.output }
    }
    case 'Edit': {
      const { file_path, new_string } = event.input as {
        file_path: string
        new_string: string
      }
      return {
        kind: 'write',
        path: file_path,
        content: new_string,
        output: event.output,
      }
    }
    default:
      return {
        kind: 'other',
        tool: event.tool,
        input: event.input,
        output: event.output,
      }
  }
}
