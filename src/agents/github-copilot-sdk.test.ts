import { describe, it, expect } from 'vitest'

import { githubCopilotSdk } from './github-copilot-sdk.js'

describe('githubCopilotSdk', () => {
  it('returns the verdict parsed from the assistant message content', async () => {
    const client = githubCopilotSdk({
      copilotClientFactory: fakeClient(
        '{"verdict":"violation","reason":"no test"}',
      ),
    })

    const verdict = await client.reason('some prompt')

    expect(verdict).toEqual({ verdict: 'violation', reason: 'no test' })
  })

  it('parses a distinct verdict from a different assistant response', async () => {
    const client = githubCopilotSdk({
      copilotClientFactory: fakeClient(
        '{"verdict":"pass","reason":"looks fine"}',
      ),
    })

    const verdict = await client.reason('some prompt')

    expect(verdict).toEqual({ verdict: 'pass', reason: 'looks fine' })
  })

  it('forwards the rule prompt verbatim to session.sendAndWait', async () => {
    const capture = captureCopilotClient()
    const client = githubCopilotSdk({ copilotClientFactory: capture.factory })

    await client.reason('rule prompt text')

    expect(capture.lastSendAndWaitOptions?.prompt).toBe('rule prompt text')
  })

  it('creates the session with availableTools: [] so the validator cannot act', async () => {
    const capture = captureCopilotClient()
    const client = githubCopilotSdk({ copilotClientFactory: capture.factory })

    await client.reason('prompt')

    expect(capture.lastSessionConfig?.availableTools).toEqual([])
  })

  it('calls client.start() before creating the session', async () => {
    const capture = captureCopilotClient()
    const client = githubCopilotSdk({ copilotClientFactory: capture.factory })

    await client.reason('prompt')

    expect(capture.startCalled).toBe(true)
  })

  it('calls client.stop() to release the spawned CLI subprocess', async () => {
    const capture = captureCopilotClient()
    const client = githubCopilotSdk({ copilotClientFactory: capture.factory })

    await client.reason('prompt')

    expect(capture.stopCalled).toBe(true)
  })

  it('forwards the onPermissionRequest handler from options into createSession', async () => {
    const capture = captureCopilotClient()
    const handler = () => ({ kind: 'allow' as const })
    const client = githubCopilotSdk({
      copilotClientFactory: capture.factory,
      onPermissionRequest: handler,
    })

    await client.reason('prompt')

    expect(capture.lastSessionConfig?.onPermissionRequest).toBe(handler)
  })

  it('returns a fail-closed violation when sendAndWait returns undefined', async () => {
    const client = githubCopilotSdk({
      copilotClientFactory: () => ({
        async start() {},
        async createSession() {
          return {
            async sendAndWait() {
              return undefined
            },
          }
        },
        async stop() {
          return []
        },
      }),
    })

    const verdict = await client.reason('prompt')

    expect(verdict.verdict).toBe('violation')
    expect(verdict.reason).toMatch(/no response from copilot/i)
  })

  it('returns a fail-closed violation when the SDK call throws', async () => {
    const client = githubCopilotSdk({
      copilotClientFactory: () => ({
        async start() {},
        async createSession() {
          return {
            async sendAndWait() {
              throw new Error('copilot CLI not authenticated')
            },
          }
        },
        async stop() {
          return []
        },
      }),
    })

    const verdict = await client.reason('prompt')

    expect(verdict.verdict).toBe('violation')
    expect(verdict.reason).toMatch(/copilot CLI not authenticated/)
  })
})

type SessionConfig = {
  availableTools?: string[]
  onPermissionRequest?: unknown
}

function captureCopilotClient() {
  const state: {
    lastSendAndWaitOptions?: { prompt: string }
    lastSessionConfig?: SessionConfig
    startCalled: boolean
    stopCalled: boolean
  } = { startCalled: false, stopCalled: false }
  const factory = () => ({
    async start() {
      state.startCalled = true
    },
    async createSession(config: SessionConfig) {
      state.lastSessionConfig = config
      return {
        async sendAndWait(options: { prompt: string }) {
          state.lastSendAndWaitOptions = options
          return { data: { content: '{"verdict":"pass","reason":""}' } }
        },
      }
    },
    async stop() {
      state.stopCalled = true
      return []
    },
  })
  return {
    factory,
    get lastSendAndWaitOptions() {
      return state.lastSendAndWaitOptions
    },
    get lastSessionConfig() {
      return state.lastSessionConfig
    },
    get startCalled() {
      return state.startCalled
    },
    get stopCalled() {
      return state.stopCalled
    },
  }
}

function fakeClient(assistantContent: string) {
  return () => ({
    async start() {},
    async createSession() {
      return {
        async sendAndWait() {
          return { data: { content: assistantContent } }
        },
      }
    },
    async stop() {
      return []
    },
  })
}
