import { describe, it, expect } from 'vitest'

import * as claudeCode from '../../src/adapter/claude-code.js'
import { dispatch } from '../../src/cli.js'
import { enforceTdd } from '../../src/rules/enforce-tdd.js'

const runAi = process.env.CONDUCT_INTEGRATION_AI === '1'

describe.skipIf(!runAi)('enforce-tdd (integration with real AI)', () => {
  it('allows clean TDD with minimal implementation', async () => {
    const payload = buildWritePayload({
      transcript: 'test/fixtures/transcripts/tdd-clean.jsonl',
      file_path: '/workspaces/conduct/src/add.ts',
      content: 'export const add = (a: number, b: number): number => a + b\n',
    })

    const response = await dispatch(claudeCode, payload, [enforceTdd()])
    const parsed = JSON.parse(response)

    expect(parsed.hookSpecificOutput.permissionDecision).toBe('allow')
  }, 60000)
})

function buildWritePayload(opts: {
  transcript: string
  file_path: string
  content: string
}): string {
  return JSON.stringify({
    session_id: 'integration',
    transcript_path: opts.transcript,
    cwd: '/workspaces/conduct',
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: { file_path: opts.file_path, content: opts.content },
    tool_use_id: 'toolu_integration',
  })
}
