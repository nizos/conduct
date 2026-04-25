import type { AiClient } from '../rule.js'
import { aiClientFromText } from './ai-client-from-text.js'

type Msg = { type: string; [k: string]: unknown }

export type QueryFn = (args: {
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

export function claudeAgentSdk(options: { queryFn: QueryFn }): AiClient {
  return aiClientFromText((prompt) => getResultText(options.queryFn, prompt))
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
