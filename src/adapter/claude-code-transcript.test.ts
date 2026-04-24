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
})
