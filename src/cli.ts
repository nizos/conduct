import type { Action, AiClient, Decision, Rule } from './rule.js'
import * as claudeCode from './adapter/claude-code.js'
import * as codex from './adapter/codex.js'
import * as githubCopilot from './adapter/github-copilot.js'
import { findConfig, loadConfig } from './config.js'
import { evaluate } from './engine.js'
import { claudeAgentSdk } from './providers/claude-agent-sdk.js'

type Adapter = {
  toAction: (payload: unknown) => Action
  toResponse: (decision: Decision) => string
  buildContext?: (payload: unknown) => unknown
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
  const config = await loadConfig(findConfig(process.cwd()))
  const ai = config.ai ?? claudeAgentSdk()
  return dispatch(adapter, rawPayload, config.rules, ai)
}

export async function dispatch(
  adapter: Adapter,
  rawPayload: string,
  rules: Rule[],
  ai: AiClient,
): Promise<string> {
  let payload: unknown
  try {
    payload = JSON.parse(rawPayload)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return adapter.toResponse({
      kind: 'block',
      reason: `invalid hook payload: could not parse JSON (${reason})`,
    })
  }
  let action: Action
  let baseCtx: unknown
  try {
    action = adapter.toAction(payload)
    baseCtx = adapter.buildContext?.(payload)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return adapter.toResponse({
      kind: 'block',
      reason: `invalid hook payload: ${reason}`,
    })
  }
  const ctx = { ...(baseCtx as object), ai }
  const decision = await safeEvaluate(action, rules, ctx)
  return adapter.toResponse(decision)
}

async function safeEvaluate(
  action: Action,
  rules: Rule[],
  ctx: unknown,
): Promise<Decision> {
  try {
    return await evaluate(action, rules, ctx)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { kind: 'block', reason: `rule error: ${reason}` }
  }
}
