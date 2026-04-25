import type { Action, RuleContext, SessionEvent } from '../rule.js'
import { buildMatcher } from './match-paths.js'

const SYSTEM_RUBRIC = `You are a TDD validator. Judge whether the pending write
follows test-driven development.

Rules:
1. Production code may only be introduced to satisfy a failing test that
   the session has actually observed. If no test run in the recent session
   shows a failure that the pending implementation would address, block —
   writing a test file is not enough; the test must have been run and seen
   to fail.
2. The implementation must not exceed the minimum needed to make the
   observed failing test pass. If the pending write adds functions,
   classes, or branches that are not required by the currently failing
   test, block.`

const RESPONSE_SPEC = `Respond with a single JSON object of exactly this shape:
{"verdict":"pass"|"violation","reason":"<short explanation>"}
Return JSON only. No prose, no code fences.`

function formatEvent(event: SessionEvent): string {
  if (event.kind === 'prompt') return `User: ${event.text}`
  return `${event.tool}(${JSON.stringify(event.input)}) → ${event.output}`
}

function buildPrompt(
  rubric: string,
  historyBlock: string,
  action: { path: string; content: string },
): string {
  const sections = [rubric]
  if (historyBlock) sections.push(`Recent session:\n${historyBlock}`)
  sections.push(`Pending action:\nFile: ${action.path}\n\n${action.content}`)
  sections.push(RESPONSE_SPEC)
  return sections.join('\n\n')
}

/**
 * Blocks a write unless the session's recent history shows a failing
 * test that the pending implementation would address, and the write
 * is the minimum implementation needed to make that test pass. Uses
 * an AI validator (via `ctx.agent.reason`) to judge the pending action
 * against the transcript.
 *
 * Applies to: write actions.
 * Supported agents: Claude Code. (The rule requires `ctx.agent` and
 * `ctx.history` — Codex and GitHub Copilot adapters don't currently
 * supply these.)
 *
 * Cost note: every matching write triggers an AI call, which is the
 * most expensive rule in the library. Scope with `paths` so the rule
 * only fires on the code you care about.
 *
 * @param options.instructions — overrides the built-in TDD rubric
 *   the validator is given. Defaults to a two-rule spec (failing test
 *   observed; minimum implementation).
 * @param options.paths — gitignore-style path globs to scope which
 *   writes are checked. Leading `!` negates. When omitted, every
 *   write is checked.
 *
 * @example
 * enforceTdd()
 *
 * @example
 * enforceTdd({ paths: ['src/**', '!src/**\/*.test.ts'] })
 */
export function enforceTdd(
  options: { instructions?: string; paths?: string[] } = {},
) {
  const rubric = options.instructions ?? SYSTEM_RUBRIC
  const matchesPaths = options.paths ? buildMatcher(options.paths) : () => true
  return async (action: Action, rawCtx?: unknown) => {
    if (action.type !== 'write') return { kind: 'pass' as const }
    if (!matchesPaths(action.path)) return { kind: 'pass' as const }
    const ctx = rawCtx as RuleContext
    if (!ctx.agent) return { kind: 'pass' as const }
    const events = (await ctx.history?.()) ?? []
    const historyBlock = events.map(formatEvent).join('\n')
    const prompt = buildPrompt(rubric, historyBlock, action)
    const verdict = await ctx.agent.reason(prompt)
    if (verdict.verdict === 'violation') {
      return { kind: 'violation' as const, reason: verdict.reason }
    }
    return { kind: 'pass' as const }
  }
}
