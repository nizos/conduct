import { query } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'

import type { AiClient, Verdict } from '../rule.js'

const VerdictSchema = z.object({
  verdict: z.enum(['pass', 'violation']),
  reason: z.string(),
})

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
      let text: string
      try {
        text = await getResultText(queryFn, prompt)
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        return { verdict: 'violation', reason }
      }
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
      if (typeof message.result !== 'string') {
        throw new Error(
          `expected string result from validator, got ${typeof message.result}`,
        )
      }
      return message.result
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
  const result = VerdictSchema.safeParse(parsed)
  if (!result.success) {
    return {
      verdict: 'violation',
      reason: `validator returned unexpected shape: ${text.slice(0, 200)}`,
    }
  }
  return result.data
}
