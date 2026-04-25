import type { AiClient } from '../rule.js'
import { claudeAgentSdk } from '../providers/claude-agent-sdk.js'
import { codexSdk } from '../providers/codex-sdk.js'
import type { Adapter } from './adapter.js'
import * as claudeCode from './claude-code.js'
import * as codex from './codex.js'
import * as githubCopilot from './github-copilot.js'

/**
 * Each agent entry bundles the vendor-specific adapter (payload
 * translation) with an async factory for the matching AI provider.
 * `makeAi` is async so the dynamic `import()` of each vendor SDK
 * happens only when that agent is actually selected — importing the
 * registry itself does not load any SDK.
 */
export type AgentEntry = {
  adapter: Adapter
  makeAi: () => Promise<AiClient>
}

export const adapters = {
  'claude-code': {
    adapter: claudeCode,
    makeAi: async () => {
      const mod = await import('@anthropic-ai/claude-agent-sdk')
      // The SDK's `query` has a richer Options type than our internal
      // QueryFn; the cast scopes the surface to what we actually use.
      return claudeAgentSdk({
        queryFn: mod.query as unknown as Parameters<
          typeof claudeAgentSdk
        >[0]['queryFn'],
      })
    },
  },
  codex: {
    adapter: codex,
    makeAi: async () => {
      const mod = await import('@openai/codex-sdk')
      return codexSdk({ codexFactory: () => new mod.Codex() })
    },
  },
  'github-copilot': {
    adapter: githubCopilot,
    // Placeholder until githubCopilotSdk lands. Uses Claude as the
    // validator so existing integration tests still work.
    makeAi: async () => {
      const mod = await import('@anthropic-ai/claude-agent-sdk')
      return claudeAgentSdk({
        queryFn: mod.query as unknown as Parameters<
          typeof claudeAgentSdk
        >[0]['queryFn'],
      })
    },
  },
} satisfies Record<string, AgentEntry>

export type Agent = keyof typeof adapters

export function isAgent(value: unknown): value is Agent {
  return typeof value === 'string' && value in adapters
}
