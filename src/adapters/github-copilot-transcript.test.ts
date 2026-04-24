import { describe, it, expect } from 'vitest'

import { readTranscript } from './github-copilot-transcript.js'

describe('github-copilot-transcript', () => {
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

  it('rejects a transcript that exceeds the maxBytes cap', async () => {
    await expect(
      readTranscript('test/fixtures/transcripts/copilot-basic.jsonl', {
        maxBytes: 100,
      }),
    ).rejects.toThrow(/bytes|cap|exceeds/i)
  })

  it('rejects a transcript that is a symbolic link', async () => {
    const { symlink, rm } = await import('node:fs/promises')
    const link = 'test/fixtures/transcripts/copilot-symlink-tmp.jsonl'
    await rm(link, { force: true })
    await symlink('copilot-basic.jsonl', link)
    try {
      await expect(readTranscript(link)).rejects.toThrow(/symlink|symbolic/i)
    } finally {
      await rm(link, { force: true })
    }
  })
})
