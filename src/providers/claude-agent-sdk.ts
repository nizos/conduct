import { query } from '@anthropic-ai/claude-agent-sdk'

import type { AiClient, Verdict } from '../rule.js'

type Msg = { type: string; [k: string]: unknown }

type QueryFn = (args: {
  prompt: string
  options?: {
    maxTurns?: number
    allowedTools?: string[]
    disallowedTools?: string[]
    thinking?: { type: 'disabled' | 'enabled' }
    permissionMode?: 'default' | 'dontAsk' | 'acceptEdits' | 'bypassPermissions'
    settingSources?: ('user' | 'project' | 'local')[]
    env?: Record<string, string | undefined>
  }
}) => AsyncIterable<Msg>

export function claudeAgentSdk(options: { queryFn?: QueryFn } = {}): AiClient {
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
      permissionMode: 'dontAsk',
      allowedTools: [],
      settingSources: [],
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
  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch {
    return {
      verdict: 'violation',
      reason: `could not parse verdict from validator output: ${text.slice(0, 200)}`,
    }
  }
  if (!isVerdict(parsed)) {
    return {
      verdict: 'violation',
      reason: `validator returned unexpected shape: ${text.slice(0, 200)}`,
    }
  }
  return parsed
}

function isVerdict(value: unknown): value is Verdict {
  if (typeof value !== 'object' || value === null) return false
  const v = value as { verdict?: unknown; reason?: unknown }
  return (
    (v.verdict === 'pass' || v.verdict === 'violation') &&
    typeof v.reason === 'string'
  )
}
