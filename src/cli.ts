import type { Action } from './rule.js'
import * as claudeCode from './adapter/claude-code.js'
import * as codex from './adapter/codex.js'
import * as githubCopilot from './adapter/github-copilot.js'
import { findConfig, loadConfig } from './config.js'
import { evaluate, type Decision } from './engine.js'

type Adapter = {
  toAction: (payload: unknown) => Action
  toResponse: (decision: Decision) => string
}

const adapters = {
  'claude-code': claudeCode,
  codex,
  'github-copilot': githubCopilot,
} satisfies Record<string, Adapter>

export type Agent = keyof typeof adapters

export async function run(
  rawPayload: string,
  options: { agent: Agent },
): Promise<string> {
  const adapter = adapters[options.agent]
  if (!adapter) {
    const known = Object.keys(adapters).join(', ')
    throw new Error(
      `unknown agent: ${String(options.agent)}. Expected one of: ${known}`,
    )
  }
  const payload = JSON.parse(rawPayload) as unknown
  const action = adapter.toAction(payload)
  const config = await loadConfig(findConfig(process.cwd()))
  const decision = evaluate(action, config.rules)
  return adapter.toResponse(decision)
}
