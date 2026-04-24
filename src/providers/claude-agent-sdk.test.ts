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
})

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
