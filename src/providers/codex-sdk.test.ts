import type { ThreadOptions } from '@openai/codex-sdk'
import { describe, it, expect } from 'vitest'

import { codexSdk } from './codex-sdk.js'

describe('codexSdk', () => {
  it('returns the verdict parsed from the thread final response', async () => {
    const client = codexSdk({
      codexFactory: fakeCodex('{"verdict":"violation","reason":"no test"}'),
    })

    const verdict = await client.reason('some prompt')

    expect(verdict).toEqual({ verdict: 'violation', reason: 'no test' })
  })

  it('parses a distinct verdict from a different thread response', async () => {
    const client = codexSdk({
      codexFactory: fakeCodex('{"verdict":"pass","reason":"looks fine"}'),
    })

    const verdict = await client.reason('some prompt')

    expect(verdict).toEqual({ verdict: 'pass', reason: 'looks fine' })
  })

  it('starts the thread with skipGitRepoCheck so the validator runs anywhere', async () => {
    const capture = captureCodex()
    const client = codexSdk({ codexFactory: capture.factory })

    await client.reason('prompt')

    expect(capture.lastThreadOptions?.skipGitRepoCheck).toBe(true)
  })

  it('uses read-only sandboxMode so the validator cannot write or run commands', async () => {
    const capture = captureCodex()
    const client = codexSdk({ codexFactory: capture.factory })

    await client.reason('prompt')

    expect(capture.lastThreadOptions?.sandboxMode).toBe('read-only')
  })

  it("uses approvalPolicy 'never' so the validator cannot escalate", async () => {
    const capture = captureCodex()
    const client = codexSdk({ codexFactory: capture.factory })

    await client.reason('prompt')

    expect(capture.lastThreadOptions?.approvalPolicy).toBe('never')
  })

  it('disables network access so the validator cannot reach out', async () => {
    const capture = captureCodex()
    const client = codexSdk({ codexFactory: capture.factory })

    await client.reason('prompt')

    expect(capture.lastThreadOptions?.networkAccessEnabled).toBe(false)
  })

  it('disables web search so the validator stays self-contained', async () => {
    const capture = captureCodex()
    const client = codexSdk({ codexFactory: capture.factory })

    await client.reason('prompt')

    expect(capture.lastThreadOptions?.webSearchEnabled).toBe(false)
  })

  it('forwards the rule prompt verbatim to thread.run', async () => {
    const capture = captureCodex()
    const client = codexSdk({ codexFactory: capture.factory })

    await client.reason('rule prompt text')

    expect(capture.lastRunInput).toBe('rule prompt text')
  })

  it('returns a fail-closed violation when the SDK run throws', async () => {
    const client = codexSdk({
      codexFactory: () => ({
        startThread() {
          return {
            async run() {
              throw new Error('codex CLI not found')
            },
          }
        },
      }),
    })

    const verdict = await client.reason('prompt')

    expect(verdict.verdict).toBe('violation')
    expect(verdict.reason).toMatch(/codex CLI not found/)
  })
})

function captureCodex() {
  const state: {
    lastThreadOptions?: ThreadOptions
    lastRunInput?: string
  } = {}
  const factory = () => ({
    startThread(opts?: ThreadOptions) {
      state.lastThreadOptions = opts
      return {
        async run(input?: string) {
          state.lastRunInput = input
          return { finalResponse: '{"verdict":"pass","reason":""}' }
        },
      }
    },
  })
  return {
    factory,
    get lastThreadOptions() {
      return state.lastThreadOptions
    },
    get lastRunInput() {
      return state.lastRunInput
    },
  }
}

function fakeCodex(finalResponse: string) {
  return () => ({
    startThread() {
      return {
        async run() {
          return { finalResponse }
        },
      }
    },
  })
}
