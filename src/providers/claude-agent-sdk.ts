import { query } from '@anthropic-ai/claude-agent-sdk'

type Verdict = { verdict: 'pass' | 'violation'; reason: string }

type Msg = { type: string; [k: string]: unknown }

type QueryFn = (args: { prompt: string }) => AsyncIterable<Msg>

export function claudeAgentSdk(options: { queryFn?: QueryFn } = {}) {
  const queryFn = options.queryFn ?? (query as unknown as QueryFn)
  return {
    reason: async (prompt: string): Promise<Verdict> => {
      for await (const message of queryFn({ prompt })) {
        if (message.type === 'result' && message.subtype === 'success') {
          return JSON.parse(message.result as string) as Verdict
        }
      }
      throw new Error('no result message received')
    },
  }
}
