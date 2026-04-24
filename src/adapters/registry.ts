import type { Adapter } from './adapter.js'
import * as claudeCode from './claude-code.js'
import * as codex from './codex.js'
import * as githubCopilot from './github-copilot.js'

export const adapters = {
  'claude-code': claudeCode,
  codex,
  'github-copilot': githubCopilot,
} satisfies Record<string, Adapter>

export type Agent = keyof typeof adapters

export function isAgent(value: unknown): value is Agent {
  return typeof value === 'string' && value in adapters
}
