import type { Action, Decision } from '../rule.js'

/**
 * The contract every adapter implements. Adapters translate
 * vendor-specific hook payloads into a canonical `Action` the engine
 * can evaluate, and translate the engine's `Decision` back into the
 * vendor's expected response format. `buildContext` is optional —
 * adapters that can surface session history or other capabilities
 * return them as a partial ctx the engine merges with `ai` at dispatch.
 */
export type Adapter = {
  toAction: (payload: unknown) => Action
  toResponse: (decision: Decision) => string
  buildContext?: (payload: unknown) => unknown
}
