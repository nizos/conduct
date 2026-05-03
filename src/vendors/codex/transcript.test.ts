import { describe, it, expect } from 'vitest'

import { readTranscript } from './transcript.js'

describe('codex transcript', () => {
  it('emits a prompt event for a user response_item.message', async () => {
    const events = await readTranscript(
      'test/fixtures/transcripts/codex-basic.jsonl',
    )

    const prompt = events.find((e) => e.kind === 'prompt')
    expect(prompt?.text).toMatch(/failing test for an addition/i)
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

  it('parses JSON-encoded function_call arguments into objects at the boundary', async () => {
    const events = await readTranscript(
      'test/fixtures/transcripts/codex-basic.jsonl',
    )

    const exec = events.find(
      (e) => e.kind === 'action' && e.tool === 'exec_command',
    )
    expect(exec).toBeDefined()
    if (exec?.kind !== 'action') return
    expect(typeof exec.input).toBe('object')
    const input = exec.input as { cmd: string }
    expect(typeof input.cmd).toBe('string')
  })
})
