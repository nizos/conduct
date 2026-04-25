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
 * translation) with the matching agent factory. The factory is sync;
 * each agent owns its own lazy `import()` of its vendor SDK and only
 * loads on first reason() call — importing this registry does not
 * load any SDK.
 */
export type VendorEntry = {
  adapter: Adapter
  agent: () => Agent
}

export const vendors = {
  'claude-code': { adapter: claudeCodeAdapter, agent: claudeCode },
  codex: { adapter: codexAdapter, agent: codex },
  'github-copilot': { adapter: githubCopilotAdapter, agent: githubCopilot },
} satisfies Record<string, VendorEntry>

export type Vendor = keyof typeof vendors

export function isVendor(value: unknown): value is Vendor {
  return typeof value === 'string' && value in vendors
}
