import type { Action, Agent, Rule, SessionEvent } from './rule.js'
import { findConfig, loadConfig, type Config } from './config.js'
import { evaluateSafely } from './engine.js'
import { vendors, type Vendor, type VendorEntry } from './registry.js'

export type { Vendor } from './registry.js'

export type ConfigLoader = () => Promise<Config>

const defaultConfigLoader: ConfigLoader = () =>
  loadConfig(findConfig(process.cwd()))

export async function run(
  rawPayload: string,
  options: { vendor: Vendor; loadConfig?: ConfigLoader },
): Promise<string> {
  const entry = vendors[options.vendor]
  const config = await (options.loadConfig ?? defaultConfigLoader)()
  const agent = config.agent ?? entry.agent()
  return dispatch(entry, rawPayload, config.rules, agent)
}

export async function dispatch(
  entry: VendorEntry,
  rawPayload: string,
  rules: readonly Rule[],
  agent: Agent,
): Promise<string> {
  const { adapter } = entry
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
  let history: (() => Promise<SessionEvent[]>) | undefined
  try {
    action = adapter.toAction(payload)
    const path = adapter.sessionPath?.(payload)
    history = path ? () => entry.readTranscript(path) : undefined
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return adapter.toResponse({
      kind: 'block',
      reason: `invalid hook payload: ${reason}`,
    })
  }
  const ctx = { agent, history }
  const decision = await evaluateSafely(action, rules, ctx)
  return adapter.toResponse(decision)
}
