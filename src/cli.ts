import type { Action, Rule } from './rule.js'
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
  const decision = safeEvaluate(action, config.rules)
  return adapter.toResponse(decision)
}

function safeEvaluate(action: Action, rules: Rule[]): Decision {
  try {
    return evaluate(action, rules)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { kind: 'block', reason: `rule error: ${reason}` }
  }
}
