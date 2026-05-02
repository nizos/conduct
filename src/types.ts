/**
 * Canonical action an agent attempts, as seen by rules and the engine.
 * Adapters translate vendor-specific hook payloads into this shape.
 *
 * - `write` — a file write or edit. `path` is absolute POSIX
 *   (adapters resolve it against the payload `cwd`). The engine
 *   relativizes against the config root at match time, so rule globs
 *   can be authored as `'src/**'` against the project root. Rules that
 *   read the file from disk can pass `path` straight to `fs.open`.
 * - `command` — a shell command invocation; carries the command text.
 */
export type Action =
  | { kind: 'write'; path: string; content: string }
  | { kind: 'command'; command: string }

/**
 * The engine's decision after evaluating rules against an action.
 *
 * - `allow` — no rule objected; the action may proceed.
 * - `block` — a rule objected; `reason` is surfaced back to the agent
 *   via its adapter's response format.
 */
export type Decision = { kind: 'allow' } | { kind: 'block'; reason: string }

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
