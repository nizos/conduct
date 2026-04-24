/**
 * Canonical action an agent attempts, as seen by rules and the engine.
 * Adapters translate vendor-specific hook payloads into this shape.
 *
 * - `write` — a file write or edit; carries the target path and the
 *   content being written.
 * - `command` — a shell command invocation; carries the command text.
 */
export type Action =
  | { type: 'write'; path: string; content: string }
  | { type: 'command'; command: string }

/**
 * The outcome of a rule evaluating an action.
 *
 * - `pass` — no violation; the rule has no objection.
 * - `violation` — the rule objects; `reason` is surfaced to the agent.
 */
export type RuleResult =
  | { kind: 'pass' }
  | { kind: 'violation'; reason: string }

/**
 * A rule as the engine consumes it: a function from Action (+ an
 * optional context injected by the engine) to RuleResult. Rules may be
 * synchronous or asynchronous; the engine awaits the returned value
 * either way. The context shape is intentionally `unknown` at this
 * layer — rules that need specific capabilities narrow internally.
 * Rule modules export factories of the form `(options) => Rule`.
 */
export type Rule = (
  action: Action,
  ctx?: unknown,
) => RuleResult | Promise<RuleResult>
