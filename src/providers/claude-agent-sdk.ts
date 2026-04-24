import type { AiClient, Verdict } from '../rule.js'
import { parseVerdict } from './parse-verdict.js'

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

/**
 * The SDK import is ~670 KB of JS. We defer it to the first time a rule
 * actually asks for a verdict so hook invocations whose rules are all
 * static (filenameCasing, forbid*) don't pay the cold-start cost.
 */
async function loadSdkQuery(): Promise<QueryFn> {
  const mod = await import('@anthropic-ai/claude-agent-sdk')
  return mod.query as unknown as QueryFn
}

export function claudeAgentSdk(options: { queryFn?: QueryFn } = {}): AiClient {
  return {
    reason: async (prompt: string): Promise<Verdict> => {
      const queryFn = options.queryFn ?? (await loadSdkQuery())
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
