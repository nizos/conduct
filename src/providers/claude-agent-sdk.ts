import { query } from '@anthropic-ai/claude-agent-sdk'

type Verdict = { verdict: 'pass' | 'violation'; reason: string }

type Msg = { type: string; [k: string]: unknown }

type QueryFn = (args: {
  prompt: string
  options?: {
    maxTurns?: number
    disallowedTools?: string[]
    maxThinkingTokens?: number
    env?: Record<string, string | undefined>
  }
}) => AsyncIterable<Msg>

export function claudeAgentSdk(options: { queryFn?: QueryFn } = {}) {
  const queryFn = options.queryFn ?? (query as unknown as QueryFn)
  return {
    reason: async (prompt: string): Promise<Verdict> => {
      for await (const message of queryFn({
        prompt,
        options: {
          maxTurns: 1,
          maxThinkingTokens: 0,
          env: cleanEnv(),
          disallowedTools: [
            'Bash',
            'Write',
            'Edit',
            'MultiEdit',
            'NotebookEdit',
            'Read',
            'Grep',
            'Glob',
            'WebFetch',
            'WebSearch',
            'Task',
            'TodoWrite',
          ],
        },
      })) {
        if (message.type === 'result' && message.subtype === 'success') {
          return JSON.parse(message.result as string) as Verdict
        }
      }
      throw new Error('no result message received')
    },
  }
}

function cleanEnv(): Record<string, string | undefined> {
  const env = { ...process.env }
  delete env.CLAUDECODE
  return env
}
