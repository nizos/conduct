import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, it, expect, onTestFinished } from 'vitest'

import { deriveChatSessionsPath, readTranscript } from './transcript.js'

describe('github-copilot-chat transcript', () => {
  it('derives the chatSessions path from a Windows-style transcript path', () => {
    expect(
      deriveChatSessionsPath(
        'C:\\workspace\\GitHub.copilot-chat\\transcripts\\sess.jsonl',
      ),
    ).toBe('C:\\workspace\\chatSessions\\sess.jsonl')
  })

  it('handles Git Bash / WSL-style /c/... transcript paths', () => {
    expect(
      deriveChatSessionsPath(
        '/c/workspace/GitHub.copilot-chat/transcripts/sess.jsonl',
      ),
    ).toBe('/c/workspace/chatSessions/sess.jsonl')
  })

  it('extracts user.message events as prompts in the timeline', async () => {
    const events = await readTranscript(
      'test/fixtures/github-copilot-chat/transcript-sample.jsonl',
    )

    expect(events).toContainEqual({
      kind: 'prompt',
      text: 'Take a look at the README.md and AGENTS.md and start the development',
    })
  })

  it('extracts tool.execution_start events as actions in the timeline (output empty until joined)', async () => {
    const events = await readTranscript(
      'test/fixtures/github-copilot-chat/transcript-sample.jsonl',
    )

    expect(events).toContainEqual({
      kind: 'action',
      tool: 'read_file',
      input: { filePath: '/repo/README.md', startLine: 1, endLine: 50 },
      output: '',
      toolUseId: 'call_aaa111',
    })
  })

  it('reads tool outputs from a resumed session where results are pre-populated in kind:0', async () => {
    const events = await readTranscript(
      'test/fixtures/github-copilot-chat/transcript-resumed.jsonl',
      {
        chatSessionsPath:
          'test/fixtures/github-copilot-chat/chatsession-resumed.jsonl',
      },
    )
    const action = events.find((e) => e.kind === 'action')

    expect(action?.output).toBe('the resumed result')
  })

  it('joins a plain-string output from chatSessions onto the matching action', async () => {
    const events = await readTranscript(
      'test/fixtures/github-copilot-chat/transcript-direct-id.jsonl',
      {
        chatSessionsPath:
          'test/fixtures/github-copilot-chat/chatsession-direct-id.jsonl',
      },
    )
    const action = events.find((e) => e.kind === 'action')

    expect(action?.output).toBe('the result')
  })

  it('matches chatSessions ids that carry a __vscode- suffix to bare transcript ids', async () => {
    const events = await readTranscript(
      'test/fixtures/github-copilot-chat/transcript-sample.jsonl',
      {
        chatSessionsPath:
          'test/fixtures/github-copilot-chat/chatsession-sample.jsonl',
      },
    )

    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'action',
        tool: 'replace_string_in_file',
        output: 'The file /repo/src/cart.ts was successfully updated.',
      }),
    )
  })

  it('extracts rich-tree outputs by walking type-2 leaves for tools that render structured content', async () => {
    const events = await readTranscript(
      'test/fixtures/github-copilot-chat/transcript-sample.jsonl',
      {
        chatSessionsPath:
          'test/fixtures/github-copilot-chat/chatsession-sample.jsonl',
      },
    )

    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'action',
        tool: 'read_file',
        output: '# Shopping Cart\n\nA simple shopping cart implementation.\n',
      }),
    )
  })

  it('derives the chatSessions path from the transcript path when not explicitly provided', async () => {
    const events = await readTranscript(
      'test/fixtures/github-copilot-chat/GitHub.copilot-chat/transcripts/derive-test.jsonl',
    )
    const action = events.find((e) => e.kind === 'action')

    expect(action?.output).toBe('the derived result')
  })

  it('leaves unmatched actions with empty output and ignores orphan toolCallResults entries', async () => {
    const events = await readTranscript(
      'test/fixtures/github-copilot-chat/transcript-direct-id.jsonl',
      {
        chatSessionsPath:
          'test/fixtures/github-copilot-chat/chatsession-unmatched.jsonl',
      },
    )
    const action = events.find((e) => e.kind === 'action')

    expect(action?.output).toBe('')
    expect(events.filter((e) => e.kind === 'action')).toHaveLength(1)
  })

  it('returns prompts and actions with empty outputs when the chatSessions file is missing', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'probity-transcript-'))
    onTestFinished(async () => {
      await rm(dir, { recursive: true, force: true })
    })
    const missingPath = path.join(dir, 'does-not-exist.jsonl')
    const events = await readTranscript(
      'test/fixtures/github-copilot-chat/transcript-direct-id.jsonl',
      { chatSessionsPath: missingPath },
    )
    const action = events.find((e) => e.kind === 'action')

    expect(action?.output).toBe('')
  })

  it('propagates non-missing-file errors from chatSessions (e.g. exceeds maxBytes)', async () => {
    await expect(
      readTranscript(
        'test/fixtures/github-copilot-chat/transcript-direct-id.jsonl',
        {
          chatSessionsPath:
            'test/fixtures/github-copilot-chat/chatsession-sample.jsonl',
          maxBytes: 1000,
        },
      ),
    ).rejects.toThrow(/exceeds/)
  })

  it('produces a canonical timeline joining every sample action with its output', async () => {
    const events = await readTranscript(
      'test/fixtures/github-copilot-chat/transcript-sample.jsonl',
      {
        chatSessionsPath:
          'test/fixtures/github-copilot-chat/chatsession-sample.jsonl',
      },
    )

    expect(events).toEqual([
      {
        kind: 'prompt',
        text: 'Take a look at the README.md and AGENTS.md and start the development',
      },
      {
        kind: 'action',
        tool: 'read_file',
        input: { filePath: '/repo/README.md', startLine: 1, endLine: 50 },
        output: '# Shopping Cart\n\nA simple shopping cart implementation.\n',
        toolUseId: 'call_aaa111',
      },
      {
        kind: 'action',
        tool: 'replace_string_in_file',
        input: {
          filePath: '/repo/src/cart.ts',
          oldString: '',
          newString: 'export class ShoppingCart {}\n',
        },
        output: 'The file /repo/src/cart.ts was successfully updated.',
        toolUseId: 'call_bbb222',
      },
      {
        kind: 'action',
        tool: 'runTests',
        input: { files: ['/repo/src/cart.test.ts'] },
        output:
          'Test results:\n\n PASS  src/cart.test.ts\n  ShoppingCart\n    ✓ should be defined (3 ms)\n\nTest Files  1 passed (1)\n     Tests  1 passed (1)\n  Start at  06:23:55\n  Duration  812 ms',
        toolUseId: 'call_ccc333',
      },
    ])
  })
})
