import type { z } from 'zod'

import type { Action, Decision } from '../types.js'

/**
 * The contract every adapter implements. Adapters translate
 * vendor-specific hook payloads into a canonical `Action` the engine
 * can evaluate, and translate the engine's `Decision` back into the
 * vendor's expected response format. `sessionPath` is optional —
 * adapters that can locate the agent's session log return its path
 * (e.g. resolved from a `transcript_path` field in the payload, or
 * computed from a `sessionId` plus a vendor home dir). The engine
 * pairs it with the vendor's transcript reader to surface
 * `ctx.history` to rules.
 */
export type Adapter = {
  actionSchema: z.ZodType<Action>
  toResponse: (decision: Decision) => string
  sessionPath?: (payload: unknown) => string | undefined
}
