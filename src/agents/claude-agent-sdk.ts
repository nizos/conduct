import type { Options as ClaudeQueryOptions } from '@anthropic-ai/claude-agent-sdk'

import type { Agent } from '../rule.js'
import { toVerdict } from './to-verdict.js'

type Msg = { type: string; [k: string]: unknown }

export type QueryFn = (args: {
  prompt: string
  options?: ClaudeQueryOptions
}) => AsyncIterable<Msg>

export function claudeAgentSdk(options: { queryFn: QueryFn }): Agent {
  return {
    reason: (prompt) => toVerdict(() => getResultText(options.queryFn, prompt)),
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
      // Defense in depth: `allowedTools: []` + `permissionMode: 'dontAsk'`
      // already blocks tool use, but explicitly naming every known tool
      // guarantees the validator can't act even if the SDK defaults drift.
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
  throw new Error(
    'no result message received: SDK query stream ended without a ' +
      '{type:"result", subtype:"success"} message (typically an SDK/transport failure)',
  )
}
