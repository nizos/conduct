import type { RawSessionEvent, SessionEvent } from '../../types.js'

export function toCanonical(event: RawSessionEvent): SessionEvent {
  if (event.kind === 'prompt') return event
  if (event.tool === 'shell') {
    const input = event.input as { command: string }
    return { kind: 'command', command: input.command, output: event.output }
  }
  if (event.tool === 'exec_command') {
    const input = event.input as { cmd: string }
    return { kind: 'command', command: input.cmd, output: event.output }
  }
  return {
    kind: 'other',
    tool: event.tool,
    input: event.input,
    output: event.output,
  }
}
