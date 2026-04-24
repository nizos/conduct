import { query } from '@anthropic-ai/claude-agent-sdk'

type Verdict = { verdict: 'pass' | 'violation'; reason: string }

type Msg = { type: string; [k: string]: unknown }

type QueryFn = (args: {
  prompt: string
  options?: {
    maxTurns?: number
    disallowedTools?: string[]
    thinking?: { type: 'disabled' | 'enabled' }
    env?: Record<string, string | undefined>
  }
}) => AsyncIterable<Msg>

export function claudeAgentSdk(options: { queryFn?: QueryFn } = {}) {
  const queryFn = options.queryFn ?? (query as unknown as QueryFn)
  return {
    reason: async (prompt: string): Promise<Verdict> => {
      const text = await getResultText(queryFn, prompt)
      return parseVerdict(text)
    },
  }
}

async function getResultText(
  queryFn: QueryFn,
  prompt: string,
): Promise<string> {
  for await (const message of queryFn({
    prompt,
    options: {
      maxTurns: 1,
      thinking: { type: 'disabled' },
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
      return message.result as string
    }
  }
  throw new Error('no result message received')
}

function parseVerdict(text: string): Verdict {
  const stripped = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
  try {
    return JSON.parse(stripped) as Verdict
  } catch {
    return {
      verdict: 'violation',
      reason: `could not parse verdict from validator output: ${text.slice(0, 200)}`,
    }
  }
}

function cleanEnv(): Record<string, string | undefined> {
  const env = { ...process.env }
  delete env.CLAUDECODE
  return env
}
