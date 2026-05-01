import type { Action, Agent, Decision, SessionEvent } from './types.js'
import {
  findConfig,
  loadConfig,
  type Config,
  type RuleEntry,
} from './config.js'
import { evaluate } from './engine.js'
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
  const agent = config.ai ?? entry.agent()
  return dispatch(entry, rawPayload, config.rules, agent)
}

async function dispatch(
  entry: VendorEntry,
  rawPayload: string,
  rules: readonly RuleEntry[],
  agent: Agent,
): Promise<string> {
  const parsed = parsePayload(entry, rawPayload)
  const decision =
    parsed.kind === 'invalid'
      ? parsed.decision
      : await evaluate(parsed.action, rules, {
          agent,
          ...(parsed.history && { history: parsed.history }),
        })
  return entry.adapter.toResponse(decision)
}

type ParseResult =
  | {
      kind: 'ok'
      action: Action
      history: (() => Promise<SessionEvent[]>) | undefined
    }
  | { kind: 'invalid'; decision: Decision }

function parsePayload(entry: VendorEntry, rawPayload: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(rawPayload)
  } catch (error) {
    return invalid(error instanceof Error ? error.message : String(error))
  }

  const action = entry.adapter.parseAction(json)
  if (!action.ok) return invalid(action.reason)

  const sessionPath = entry.adapter.sessionPath?.(json)
  return {
    kind: 'ok',
    action: action.action,
    history: sessionPath ? () => entry.readTranscript(sessionPath) : undefined,
  }
}

function invalid(reason: string): ParseResult {
  return {
    kind: 'invalid',
    decision: { kind: 'block', reason: `invalid hook payload: ${reason}` },
  }
}
