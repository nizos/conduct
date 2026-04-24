import picomatch from 'picomatch'

import type { Action, RuleContext, SessionEvent } from '../rule.js'

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

function buildMatcher(patterns: string[]): (path: string) => boolean {
  const includes = patterns.filter((p) => !p.startsWith('!'))
  const ignore = patterns
    .filter((p) => p.startsWith('!'))
    .map((p) => p.slice(1))
  const matcher = picomatch(includes.length ? includes : '**', { ignore })
  return (path) => matcher(path)
}

function formatEvent(e: SessionEvent): string {
  if (e.kind === 'prompt') return `User: ${e.text}`
  return `${e.tool}(${JSON.stringify(e.input)}) → ${e.output}`
}

export function enforceTdd(
  options: { instructions?: string; paths?: string[] } = {},
) {
  const rubric = options.instructions ?? SYSTEM_RUBRIC
  const matchesPaths = options.paths ? buildMatcher(options.paths) : () => true
  return async (action: Action, rawCtx?: unknown) => {
    if (action.type !== 'write') return { kind: 'pass' as const }
    if (!matchesPaths(action.path)) return { kind: 'pass' as const }
    const ctx = rawCtx as RuleContext
    if (!ctx.ai) return { kind: 'pass' as const }
    const events = (await ctx.history?.()) ?? []
    const historyBlock = events.map(formatEvent).filter(Boolean).join('\n')
    const prompt = [
      rubric,
      historyBlock && `Recent session:\n${historyBlock}`,
      `Pending action:\nFile: ${action.path}\n\n${action.content}`,
      RESPONSE_SPEC,
    ]
      .filter(Boolean)
      .join('\n\n')
    const v = await ctx.ai.reason(prompt)
    if (v.verdict === 'violation') {
      return { kind: 'violation' as const, reason: v.reason }
    }
    return { kind: 'pass' as const }
  }
}
