import type { Agent, RawSessionEvent } from './types.js'
import type { Adapter } from './vendors/adapter.js'
import { claudeCode } from './vendors/claude-code/agent.js'
import * as claudeCodeAdapter from './vendors/claude-code/adapter.js'
import { readTranscript as readClaudeCodeTranscript } from './vendors/claude-code/transcript.js'
import { codex } from './vendors/codex/agent.js'
import * as codexAdapter from './vendors/codex/adapter.js'
import { readTranscript as readCodexTranscript } from './vendors/codex/transcript.js'
import { githubCopilot } from './vendors/github-copilot/agent.js'
import * as githubCopilotAdapter from './vendors/github-copilot/adapter.js'
import { readTranscript as readGithubCopilotTranscript } from './vendors/github-copilot/transcript.js'
import * as githubCopilotChatAdapter from './vendors/github-copilot-chat/adapter.js'
import { readTranscript as readGithubCopilotChatTranscript } from './vendors/github-copilot-chat/transcript.js'

/**
 * Each vendor entry bundles the three vendor-specific pieces the
 * engine needs: the adapter (payload/response translation), the agent
 * factory (AI validator — sync, lazy SDK load), and the transcript
 * reader (session log → RawSessionEvent[]). The engine composes them at
 * dispatch — calling adapter.sessionPath to locate the session, then
 * readTranscript to materialise history when a rule asks for it.
 */
export type VendorEntry = {
  adapter: Adapter
  agent: () => Agent
  readTranscript: (path: string) => Promise<RawSessionEvent[]>
}

export const vendors = {
  'claude-code': {
    adapter: claudeCodeAdapter,
    agent: claudeCode,
    readTranscript: readClaudeCodeTranscript,
  },
  codex: {
    adapter: codexAdapter,
    agent: codex,
    readTranscript: readCodexTranscript,
  },
  'github-copilot': {
    adapter: githubCopilotAdapter,
    agent: githubCopilot,
    readTranscript: readGithubCopilotTranscript,
  },
  'github-copilot-chat': {
    adapter: githubCopilotChatAdapter,
    agent: githubCopilot,
    readTranscript: readGithubCopilotChatTranscript,
  },
} satisfies Record<string, VendorEntry>

export type Vendor = keyof typeof vendors

export function isVendor(value: unknown): value is Vendor {
  return typeof value === 'string' && Object.hasOwn(vendors, value)
}
