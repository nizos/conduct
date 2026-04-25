import type { Agent } from '../rule.js'
import { claudeCode } from '../agents/claude-code.js'
import { codexSdk } from '../agents/codex-sdk.js'
import { githubCopilotSdk } from '../agents/github-copilot-sdk.js'
import type { Adapter } from './adapter.js'
import * as claudeCodeAdapter from './claude-code.js'
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
    adapter: claudeCodeAdapter,
    makeAi: async () => claudeCode(),
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
