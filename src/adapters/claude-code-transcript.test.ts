import { describe, it, expect } from 'vitest'

import { readTranscript } from './claude-code-transcript.js'

describe('claude-code-transcript', () => {
  it('pairs a tool_use with its tool_result into a single action event', async () => {
    const events = await readTranscript('test/fixtures/transcripts/basic.jsonl')

    expect(events).toContainEqual({
      kind: 'action',
      tool: 'Bash',
      input: { command: 'npm test' },
      output: '2 tests failed',
      toolUseId: 'tu_1',
    })
  })

  it('emits a prompt event for user text messages', async () => {
    const events = await readTranscript('test/fixtures/transcripts/basic.jsonl')

    expect(events).toContainEqual({ kind: 'prompt', text: 'add a test' })
  })

  it('skips malformed lines and keeps parsing valid ones', async () => {
    const events = await readTranscript(
      'test/fixtures/transcripts/with-malformed-line.jsonl',
    )

    expect(events).toContainEqual({ kind: 'prompt', text: 'hello' })
    expect(events).toContainEqual({
      kind: 'action',
      tool: 'Bash',
      input: { command: 'ls' },
      output: 'ok',
      toolUseId: 'tu_1',
    })
  })

  it('returns events in the order they appear in the transcript', async () => {
    const events = await readTranscript(
      'test/fixtures/transcripts/interleaved.jsonl',
    )

    expect(events.map((e) => (e as { kind: string }).kind)).toEqual([
      'action',
      'prompt',
    ])
  })
})
