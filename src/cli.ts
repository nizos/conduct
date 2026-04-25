import type { Action, Agent, Rule } from './rule.js'
import type { Adapter } from './adapters/adapter.js'
import { adapters, type Vendor } from './adapters/registry.js'
import { findConfig, loadConfig } from './config.js'
import { evaluateSafely } from './engine.js'

export type { Vendor } from './adapters/registry.js'

export async function run(
  rawPayload: string,
  options: { vendor: Vendor },
): Promise<string> {
  const entry = adapters[options.vendor]
  if (!entry) {
    const known = Object.keys(adapters).join(', ')
    throw new Error(
      `unknown vendor: ${String(options.vendor)}. Expected one of: ${known}`,
    )
  }
  const config = await loadConfig(findConfig(process.cwd()))
  const agent = config.agent ?? (await entry.makeAi())
  return dispatch(entry.adapter, rawPayload, config.rules, agent)
}

export async function dispatch(
  adapter: Adapter,
  rawPayload: string,
  rules: readonly Rule[],
  agent: Agent,
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
  let baseCtx: Record<string, unknown> = {}
  try {
    action = adapter.toAction(payload)
    baseCtx = adapter.buildContext?.(payload) ?? {}
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return adapter.toResponse({
      kind: 'block',
      reason: `invalid hook payload: ${reason}`,
    })
  }
  // CLI-injected `agent` overrides anything the adapter might have put
  // in baseCtx — the config/default agent is the canonical source of
  // `agent`, and adapters only supply session capabilities like
  // history().
  const ctx = { ...baseCtx, agent }
  const decision = await evaluateSafely(action, rules, ctx)
  return adapter.toResponse(decision)
}
