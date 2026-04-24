import { describe, it, expect } from 'vitest'

import { claudeAgentSdk } from './claude-agent-sdk.js'

describe('claudeAgentSdk', () => {
  it('returns the verdict parsed from the final result message', async () => {
    const client = claudeAgentSdk({
      queryFn: fakeQuery('{"verdict":"violation","reason":"no test"}'),
    })

    const verdict = await client.reason('some prompt')

    expect(verdict).toEqual({ verdict: 'violation', reason: 'no test' })
  })

  it('parses a distinct verdict from a different query result', async () => {
    const client = claudeAgentSdk({
      queryFn: fakeQuery('{"verdict":"pass","reason":"looks fine"}'),
    })

    const verdict = await client.reason('some prompt')

    expect(verdict).toEqual({ verdict: 'pass', reason: 'looks fine' })
  })

  it('limits the query to a single turn', async () => {
    const capture = captureQuery()
    const client = claudeAgentSdk({ queryFn: capture.fn })

    await client.reason('prompt')

    expect(capture.last?.options?.maxTurns).toBe(1)
  })

  it('disallows tool use so the validator cannot act', async () => {
    const capture = captureQuery()
    const client = claudeAgentSdk({ queryFn: capture.fn })

    await client.reason('prompt')

    expect(capture.last?.options?.disallowedTools).toEqual(
      expect.arrayContaining(['Bash', 'Write', 'Edit']),
    )
  })

  it('disables extended thinking for fast turnaround', async () => {
    const capture = captureQuery()
    const client = claudeAgentSdk({ queryFn: capture.fn })

    await client.reason('prompt')

    expect(capture.last?.options?.thinking).toEqual({ type: 'disabled' })
  })

  it('parses a verdict from a fenced code block', async () => {
    const client = claudeAgentSdk({
      queryFn: fakeQuery('```json\n{"verdict":"pass","reason":"fine"}\n```'),
    })

    const verdict = await client.reason('prompt')

    expect(verdict).toEqual({ verdict: 'pass', reason: 'fine' })
  })

  it('returns a fail-closed violation when the response is not valid JSON', async () => {
    const client = claudeAgentSdk({
      queryFn: fakeQuery('not valid json at all'),
    })

    const verdict = await client.reason('prompt')

    expect(verdict.verdict).toBe('violation')
    expect(verdict.reason).toMatch(/parse|invalid|json/i)
  })

  it('strips CLAUDECODE from the env to avoid nested-session rejection', async () => {
    process.env.CLAUDECODE = '1'
    const capture = captureQuery()
    const client = claudeAgentSdk({ queryFn: capture.fn })

    await client.reason('prompt')

    expect(capture.last?.options?.env).toBeDefined()
    expect(capture.last?.options?.env).not.toHaveProperty('CLAUDECODE')
    delete process.env.CLAUDECODE
  })
})

type CapturedArgs = {
  prompt: string
  options?: {
    maxTurns?: number
    disallowedTools?: string[]
    thinking?: { type: 'disabled' | 'enabled' }
    env?: Record<string, string | undefined>
  }
}

function captureQuery() {
  const state: { last?: CapturedArgs } = {}
  const fn = (args: CapturedArgs) => {
    state.last = args
    async function* gen() {
      yield {
        type: 'result' as const,
        subtype: 'success' as const,
        result: '{"verdict":"pass","reason":""}',
      }
    }
    return gen()
  }
  return {
    fn,
    get last() {
      return state.last
    },
  }
}

function fakeQuery(resultText: string) {
  return () => {
    async function* gen() {
      yield {
        type: 'result' as const,
        subtype: 'success' as const,
        result: resultText,
      }
    }
    return gen()
  }
}
