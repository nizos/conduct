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
 * A rule as the engine consumes it: a function from Action to RuleResult.
 * Produced by binding options to a RuleDefinition via `configure`.
 */
export type Rule = (action: Action) => RuleResult

/**
 * The authored form of a rule — a function that takes the action and
 * its configured options. The engine wraps this with `configure` to
 * produce a `Rule` it can invoke with just an action.
 *
 * @typeParam Options - the shape of the rule's configuration
 */
export type RuleDefinition<Options> = (input: {
  action: Action
  options: Options
}) => RuleResult
