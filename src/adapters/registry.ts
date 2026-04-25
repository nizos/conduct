import type { Agent } from '../rule.js'
import { claudeCode } from '../agents/claude-code.js'
import { codex } from '../agents/codex.js'
import { githubCopilot } from '../agents/github-copilot.js'
import type { Adapter } from './adapter.js'
import * as claudeCodeAdapter from './claude-code.js'
import * as codexAdapter from './codex.js'
import * as githubCopilotAdapter from './github-copilot.js'

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
    adapter: codexAdapter,
    makeAi: async () => codex(),
  },
  'github-copilot': {
    adapter: githubCopilotAdapter,
    makeAi: async () => githubCopilot(),
  },
} satisfies Record<string, VendorEntry>

export type Vendor = keyof typeof adapters

export function isVendor(value: unknown): value is Vendor {
  return typeof value === 'string' && value in adapters
}
