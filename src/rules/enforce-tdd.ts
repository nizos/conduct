import { lstat, readFile, stat } from 'node:fs/promises'

import type { Action, RuleContext, SessionEvent } from '../rule.js'
import { buildMatcher } from './utils/match-paths.js'
import { trimHistory } from './utils/trim-history.js'

const DEFAULT_MAX_EVENTS = 10
const DEFAULT_MAX_CONTENT_CHARS = 1000
const MAX_BEFORE_CONTENT_BYTES = 1024 * 1024

const PROCESS_INSTRUCTIONS = `You are a TDD validator. Judge whether the pending
write follows test-driven development.

You will see three inputs:

1. "Recent session" — a chronological log of the agent's recent prompts
   and tool actions. Each entry shows what the agent did and what it
   observed back. Use this to find evidence of a failing test that the
   pending write would address.
2. "Current file content" — what's on disk right now at the file the
   agent is about to write. May be absent if the file does not exist.
3. "Pending action" — what the agent is about to write. Content may be
   raw file text or a patch/diff in any common format.`

const DEFAULT_TDD_RULES = `Rules:
1. Production code may only be introduced to satisfy a failing test
   that the session has actually observed. Writing a test file is not
   enough; the test must have been run and seen to fail before the
   pending implementation.
2. The implementation must not exceed the minimum needed to make the
   observed failing test pass. Functions, classes, or branches not
   required by the currently failing test are over-implementation.
3. A single write should add at most one new test. Compare "Current
   file content" with "Pending action" to count newly added tests; if
   more than one new test appears, block.`

const RESPONSE_SPEC = `Respond with a single JSON object of exactly this shape:
{"verdict":"pass"|"violation","reason":"<short explanation>"}
Return JSON only. No prose, no code fences.`

function formatEvent(event: SessionEvent): string {
  if (event.kind === 'prompt') return `User: ${event.text}`
  return `${event.tool}(${formatInput(event.input)}) → ${event.output}`
}

function formatInput(input: unknown): string {
  // Some vendors (e.g. codex) carry tool args as a JSON-encoded string;
  // unwrap so the validator sees `{"command":"x"}` instead of escaped
  // `"{\"command\":\"x\"}"`. Non-JSON strings (e.g. patch envelopes)
  // pass through verbatim.
  if (typeof input === 'string') {
    try {
      return JSON.stringify(JSON.parse(input))
    } catch {
      return input
    }
  }
  return JSON.stringify(input)
}

function buildPrompt(
  rules: string,
  historyBlock: string,
  beforeContent: string | undefined,
  action: { path: string; content: string },
): string {
  const sections = [PROCESS_INSTRUCTIONS, rules]
  if (historyBlock) sections.push(`Recent session:\n${historyBlock}`)
  sections.push(
    beforeContent === undefined
      ? `Current file content: (file does not exist)`
      : `Current file content:\n${beforeContent}`,
  )
  sections.push(`Pending action:\nFile: ${action.path}\n\n${action.content}`)
  sections.push(RESPONSE_SPEC)
  return sections.join('\n\n')
}

async function readBeforeContent(path: string): Promise<string | undefined> {
  try {
    const linkInfo = await lstat(path)
    if (linkInfo.isSymbolicLink()) return undefined
    const info = await stat(path)
    if (info.size > MAX_BEFORE_CONTENT_BYTES) return undefined
    return await readFile(path, 'utf8')
  } catch {
    return undefined
  }
}

/**
 * Blocks a write unless the session's recent history shows a failing
 * test that the pending implementation would address, and the write
 * is the minimum implementation needed to make that test pass. Uses
 * an AI validator (via `ctx.agent.reason`) to judge the pending action
 * against the transcript.
 *
 * Applies to: write actions.
 * Supported agents: Claude Code, Codex, GitHub Copilot.
 *
 * Cost note: every matching write triggers an AI call, which is the
 * most expensive rule in the library. Scope with `paths` so the rule
 * only fires on the code you care about.
 *
 * @param options.instructions — overrides the default TDD rules text
 *   the validator is given. The generic process instructions (what
 *   inputs the validator sees and how to read them) stay regardless;
 *   only the numbered TDD rules are replaced. Defaults to a three-rule
 *   spec (failing test observed; minimum implementation; one new test
 *   per write).
 * @param options.paths — gitignore-style path globs to scope which
 *   writes are checked. Leading `!` negates. When omitted, every
 *   write is checked.
 * @param options.maxEvents — keep at most this many of the most
 *   recent session events when building the prompt (default 10).
 *   Caps token usage when transcripts get long.
 * @param options.maxContentChars — truncate any single event's
 *   text/output longer than this, with a head + tail + marker
 *   replacement (default 1000).
 *
 * @example
 * enforceTdd()
 *
 * @example
 * enforceTdd({ paths: ['src/**', '!src/**\/*.test.ts'] })
 */
export function enforceTdd(
  options: {
    instructions?: string
    paths?: string[]
    maxEvents?: number
    maxContentChars?: number
  } = {},
) {
  const rules = options.instructions ?? DEFAULT_TDD_RULES
  const matchesPaths = options.paths ? buildMatcher(options.paths) : () => true
  const window = {
    maxEvents: options.maxEvents ?? DEFAULT_MAX_EVENTS,
    maxContentChars: options.maxContentChars ?? DEFAULT_MAX_CONTENT_CHARS,
  }
  return async (action: Action, rawCtx?: unknown) => {
    if (action.type !== 'write') return { kind: 'pass' as const }
    if (!matchesPaths(action.path)) return { kind: 'pass' as const }
    const ctx = rawCtx as RuleContext
    if (!ctx.agent) return { kind: 'pass' as const }
    const events = (await ctx.history?.()) ?? []
    const windowed = trimHistory(events, window)
    const historyBlock = windowed.map(formatEvent).join('\n')
    const beforeContent = await readBeforeContent(action.path)
    const prompt = buildPrompt(rules, historyBlock, beforeContent, action)
    const verdict = await ctx.agent.reason(prompt)
    if (verdict.verdict === 'violation') {
      return { kind: 'violation' as const, reason: verdict.reason }
    }
    return { kind: 'pass' as const }
  }
}
