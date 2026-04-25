import { z } from 'zod'

import type { Action, Agent, Decision, SessionEvent } from './types.js'
import type { Rule } from './rules/contract.js'
import { findConfig, loadConfig, type Config } from './config.js'
import { evaluateSafely } from './engine.js'
import { vendors, type Vendor, type VendorEntry } from './registry.js'
import { JsonString } from './utils/json-string.js'

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
  const parsed = parsePayload(entry, rawPayload)
  const decision =
    parsed.kind === 'invalid'
      ? parsed.decision
      : await evaluateSafely(parsed.action, rules, {
          agent,
          history: parsed.history,
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
  const json = JsonString.safeParse(rawPayload)
  if (!json.success) return invalid(formatZodError(json.error))

  const action = entry.adapter.actionSchema.safeParse(json.data)
  if (!action.success) return invalid(formatZodError(action.error))

  const sessionPath = entry.adapter.sessionPath?.(json.data)
  return {
    kind: 'ok',
    action: action.data,
    history: sessionPath ? () => entry.readTranscript(sessionPath) : undefined,
  }
}

function invalid(reason: string): ParseResult {
  return {
    kind: 'invalid',
    decision: { kind: 'block', reason: `invalid hook payload: ${reason}` },
  }
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join('; ')
}
