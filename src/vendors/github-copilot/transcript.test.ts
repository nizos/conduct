import { describe, it, expect } from 'vitest'

import { readTranscript } from './transcript.js'

describe('github-copilot transcript', () => {
  it('emits a prompt event for a user.message entry', async () => {
    const events = await readTranscript(
      'test/fixtures/transcripts/copilot-basic.jsonl',
    )

    expect(events).toContainEqual({
      kind: 'prompt',
      text: expect.stringMatching(/failing test for an addition/i),
    })
  })

  it('pairs tool.execution_start with tool.execution_complete into one action event', async () => {
    const events = await readTranscript(
      'test/fixtures/transcripts/copilot-basic.jsonl',
    )

    const bashAction = events.find(
      (e) => e.kind === 'action' && e.tool === 'bash',
    )
    expect(bashAction).toMatchObject({
      kind: 'action',
      tool: 'bash',
      output: expect.any(String),
    })
    if (bashAction?.kind === 'action') {
      expect(bashAction.output.length).toBeGreaterThan(0)
      expect(bashAction.toolUseId).toMatch(/^call_/)
    }
  })

  it('returns events in the order they appear in the transcript', async () => {
    const events = await readTranscript(
      'test/fixtures/transcripts/copilot-basic.jsonl',
    )

    const firstPrompt = events.findIndex((e) => e.kind === 'prompt')
    const firstAction = events.findIndex((e) => e.kind === 'action')
    expect(firstPrompt).toBeGreaterThanOrEqual(0)
    expect(firstAction).toBeGreaterThanOrEqual(0)
    expect(firstPrompt).toBeLessThan(firstAction)
  })
})
