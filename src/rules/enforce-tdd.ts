import { constants } from 'node:fs'
import { open } from 'node:fs/promises'

import type { Action, SessionEvent } from '../types.js'
import type { RuleContext } from './contract.js'
import { trimHistory } from './utils/trim-history.js'

const DEFAULT_MAX_EVENTS = 20
const DEFAULT_MAX_CONTENT_CHARS = 4000
const MAX_BEFORE_CONTENT_BYTES = 1024 * 1024

const PROCESS_INSTRUCTIONS = `## Role

You are a TDD validator. Judge whether the pending write follows
test-driven development.

## Inputs

You will see three inputs:

1. "Recent session" — a chronological log of the agent's recent prompts
   and tool actions. Each entry shows what the agent did and what it
   observed back. Use this to find evidence of a failing test that the
   pending write would address.
2. "Current file content" — what's on disk right now at the file the
   agent is about to write. May be absent if the file does not exist.
3. "Pending action" — what the agent is about to write. Content may be
   raw file text or a patch/diff in any common format.`

const DEFAULT_TDD_RULES = `## TDD rules

The TDD cycle is Red -> Green -> Refactor. Each phase has its own rules.

### Red phase: write a failing test first

A single write should add at most one new test. Compare current file
content with pending action to count newly added tests; existing
tests do not count. Restructuring existing tests is not "adding".

  - Adding a test is always allowed and does not require prior test
    output.
  - A test added to drive new behavior must fail for the right reason
    (an assertion, not a syntax or import error) before production
    code may be written to satisfy it.
  - A test added to capture existing behavior is allowed to pass
    immediately and must not be blocked for not failing first.
    Examples: characterization tests pinning current implementation,
    tests at a new layer (e.g. an e2e covering code already exercised
    by units), pinning tests added before a refactor pulls a seam out
    from under them.

#### Reaching a clean red

A test can fail before reaching an assertion (import unresolved,
signature mismatch). The agent may resolve these without violating TDD:

  - Import or symbol unresolved -> create empty stub only
  - Signature mismatch -> adjust signature, stub body minimally
  - Assertion failure -> implement minimal logic to pass

No new behavior is permitted at the stub-resolution step.

### Green phase: minimum to pass

The implementation must not exceed the minimum needed to make the
observed failing test pass. Functions, classes, or branches not
required by the currently failing test are over-implementation.

### Refactor phase: improve structure under green

Refactoring does not require a failing test to drive it. Production
and test edits that preserve observable behavior are allowed when all
relevant tests are passing. Examples:

  - Extracting helpers whose behavior already lives elsewhere (covered
    by existing tests). Extracting a helper whose behavior appears nowhere
    else is net new and requires a failing test first.
  - Lifting test setup (fixtures, builders, factories) into a
    dedicated or reusable helper. The helper is exercised by the tests
    that call it; no separate test for the helper is required.
  - Adding type declarations, interfaces, or constant literals
    (no runtime behavior by construction).
  - Renaming, restructuring control flow, removing dead code.
  - Reorganizing or deleting redundant tests, or splitting/combining
    existing tests. The one-new-test rule is about intent to add
    behavior, not surface diff count.

## Validator behavior

### Block messages

Name the violation, say why it breaks TDD, and point at the next
TDD-legal step.`

const RESPONSE_SPEC = `## Response format

Respond with a single JSON object of exactly this shape:
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
  if (historyBlock) sections.push(`## Recent session\n\n${historyBlock}`)
  sections.push(
    beforeContent === undefined
      ? `## Current file content\n\n(file does not exist)`
      : `## Current file content\n\n${beforeContent}`,
  )
  sections.push(
    `## Pending action\n\nFile: ${action.path}\n\n${action.content}`,
  )
  sections.push(RESPONSE_SPEC)
  return sections.join('\n\n')
}

async function readBeforeContent(path: string): Promise<string | undefined> {
  let handle
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  } catch {
    return undefined
  }
  try {
    const info = await handle.stat()
    if (info.size > MAX_BEFORE_CONTENT_BYTES) return undefined
    return await handle.readFile('utf8')
  } catch {
    return undefined
  } finally {
    await handle.close()
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
 * most expensive rule in the library. Scope with a `{ files, rules }`
 * block so the rule only fires on the code you care about.
 *
 * @param options.instructions — overrides the default TDD rules text
 *   the validator is given. The role, inputs, and response format stay
 *   regardless; only the rules text is replaced. Defaults to a
 *   Red-Green-Refactor spec covering test-first, one-new-test-per-write,
 *   minimum implementation, clean-red recovery, and refactors under green.
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
 * { files: ['src/**', '!src/**\/*.test.ts'], rules: [enforceTdd()] }
 */
export function enforceTdd(
  options: {
    instructions?: string
    maxEvents?: number
    maxContentChars?: number
  } = {},
) {
  const rules = options.instructions ?? DEFAULT_TDD_RULES
  const window = {
    maxEvents: options.maxEvents ?? DEFAULT_MAX_EVENTS,
    maxContentChars: options.maxContentChars ?? DEFAULT_MAX_CONTENT_CHARS,
  }
  return async (action: Action, ctx?: RuleContext) => {
    if (action.kind !== 'write') return { kind: 'pass' as const }
    if (!ctx?.agent) return { kind: 'pass' as const }
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
