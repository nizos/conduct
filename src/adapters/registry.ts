import type { AiClient } from '../rule.js'
import { claudeAgentSdk } from '../providers/claude-agent-sdk.js'
import type { Adapter } from './adapter.js'
import * as claudeCode from './claude-code.js'
import * as codex from './codex.js'
import * as githubCopilot from './github-copilot.js'

/**
 * Each agent entry bundles the vendor-specific adapter (payload
 * translation) with a factory for the matching AI provider. `makeAi`
 * is a factory so the provider's dependencies are loaded only when
 * the agent is actually selected — importing the registry itself
 * does not instantiate an SDK.
 */
export type AgentEntry = {
  adapter: Adapter
  makeAi: () => AiClient
}

export const adapters = {
  'claude-code': { adapter: claudeCode, makeAi: () => claudeAgentSdk() },
  codex: { adapter: codex, makeAi: () => claudeAgentSdk() },
  'github-copilot': {
    adapter: githubCopilot,
    makeAi: () => claudeAgentSdk(),
  },
} satisfies Record<string, AgentEntry>

export type Agent = keyof typeof adapters

export function isAgent(value: unknown): value is Agent {
  return typeof value === 'string' && value in adapters
}
