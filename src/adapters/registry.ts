import type { Agent } from '../rule.js'
import { claudeAgentSdk, type QueryFn } from '../providers/claude-agent-sdk.js'
import { codexSdk } from '../providers/codex-sdk.js'
import { githubCopilotSdk } from '../providers/github-copilot-sdk.js'
import type { Adapter } from './adapter.js'
import * as claudeCode from './claude-code.js'
import * as codex from './codex.js'
import * as githubCopilot from './github-copilot.js'

/**
 * Each vendor entry bundles the vendor-specific adapter (payload
 * translation) with an async factory for the matching AI provider.
 * `makeAi` is async so the dynamic `import()` of each vendor SDK
 * happens only when that vendor is actually selected — importing the
 * registry itself does not load any SDK.
 */
export type VendorEntry = {
  adapter: Adapter
  makeAi: () => Promise<Agent>
}

export const adapters = {
  'claude-code': {
    adapter: claudeCode,
    makeAi: async () => {
      const mod = await import('@anthropic-ai/claude-agent-sdk')
      // SDK's `query` returns `Query` (an AsyncGenerator of SDKMessage);
      // QueryFn is structurally a subset, so a narrow cast suffices.
      return claudeAgentSdk({ queryFn: mod.query as unknown as QueryFn })
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
    makeAi: async () => {
      const mod = await import('@github/copilot-sdk')
      return githubCopilotSdk({
        copilotClientFactory: () => new mod.CopilotClient({}),
        onPermissionRequest: mod.approveAll,
      })
    },
  },
} satisfies Record<string, VendorEntry>

export type Vendor = keyof typeof adapters

export function isVendor(value: unknown): value is Vendor {
  return typeof value === 'string' && value in adapters
}
