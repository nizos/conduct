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
 * The engine's decision after evaluating rules against an action.
 *
 * - `allow` — no rule objected; the action may proceed.
 * - `block` — a rule objected; `reason` is surfaced back to the agent
 *   via its adapter's response format.
 */
export type Decision = { kind: 'allow' } | { kind: 'block'; reason: string }

/**
 * A rule as the engine consumes it: a function from Action (+ an
 * optional context injected by the engine) to RuleResult. Rules may be
 * synchronous or asynchronous; the engine awaits the returned value
 * either way. The context shape is intentionally `unknown` at this
 * layer — rules that need specific capabilities narrow internally,
 * typically to `RuleContext` below. Rule modules export factories of
 * the form `(options) => Rule`.
 */
export type Rule = (
  action: Action,
  ctx?: unknown,
) => RuleResult | Promise<RuleResult>

/**
 * The verdict an AI validator returns — the shape `Agent.reason`
 * resolves to and the shape rules use to decide pass vs violation.
 */
export type Verdict = { verdict: 'pass' | 'violation'; reason: string }

/**
 * The minimal AI-validator contract. Rules that need LLM judgment reach
 * for `ctx.agent.reason(prompt)`; agents implement this one method and
 * are swappable without touching rule code.
 */
export type Agent = {
  reason: (prompt: string) => Promise<Verdict>
}

/**
 * A normalized event from the agent's recent session — what the agent
 * asked, did, and saw. Adapters translate vendor-specific transcripts
 * into this shape. Rules consume it via `ctx.history()`.
 */
export type SessionEvent =
  | { kind: 'prompt'; text: string }
  | {
      kind: 'action'
      tool: string
      input: unknown
      output: string
      toolUseId: string
    }

/**
 * The capabilities the engine makes available to rules. All fields are
 * optional at the type level because different adapters supply
 * different subsets. Rules should narrow defensively when they read.
 */
export type RuleContext = {
  agent?: Agent
  history?: () => Promise<SessionEvent[]>
}
