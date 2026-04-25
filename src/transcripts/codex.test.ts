import { describe, it, expect } from 'vitest'

import { readTranscript } from './codex.js'

describe('codex transcript', () => {
  it('emits a prompt event for a user response_item.message', async () => {
    const events = await readTranscript(
      'test/fixtures/transcripts/codex-basic.jsonl',
    )

    expect(events).toContainEqual({
      kind: 'prompt',
      text: expect.stringMatching(/failing test for an addition/i),
    })
  })

  it('pairs function_call with function_call_output into one action event', async () => {
    const events = await readTranscript(
      'test/fixtures/transcripts/codex-basic.jsonl',
    )

    const exec = events.find(
      (e) => e.kind === 'action' && e.tool === 'exec_command',
    )
    expect(exec).toBeDefined()
    if (exec?.kind === 'action') {
      expect(exec.toolUseId).toMatch(/^call_/)
      expect(exec.output.length).toBeGreaterThan(0)
    }
  })

  it('treats apply_patch (custom_tool_call) as an action event', async () => {
    const events = await readTranscript(
      'test/fixtures/transcripts/codex-basic.jsonl',
    )

    const patch = events.find(
      (e) => e.kind === 'action' && e.tool === 'apply_patch',
    )
    expect(patch).toBeDefined()
    if (patch?.kind === 'action') {
      expect(patch.output.length).toBeGreaterThan(0)
    }
  })

  it('rejects a transcript that exceeds the maxBytes cap', async () => {
    await expect(
      readTranscript('test/fixtures/transcripts/codex-basic.jsonl', {
        maxBytes: 100,
      }),
    ).rejects.toThrow(/bytes|cap|exceeds/i)
  })

  it('rejects a transcript that is a symbolic link', async () => {
    const { symlink, rm } = await import('node:fs/promises')
    const link = 'test/fixtures/transcripts/codex-symlink-tmp.jsonl'
    await rm(link, { force: true })
    await symlink('codex-basic.jsonl', link)
    try {
      await expect(readTranscript(link)).rejects.toThrow(/symlink|symbolic/i)
    } finally {
      await rm(link, { force: true })
    }
  })
})
