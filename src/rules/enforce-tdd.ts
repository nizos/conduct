import type { Action } from '../rule.js'

type Verdict = { verdict: 'pass' | 'violation'; reason: string }

type SessionEvent =
  | { kind: 'prompt'; text: string }
  | {
      kind: 'action'
      tool: string
      input: unknown
      output: string
      toolUseId: string
    }
  | { output?: string }

type RuleContext = {
  ai: {
    reason: (prompt: string) => Promise<Verdict>
  }
  history?: () => Promise<SessionEvent[]>
}

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

function formatEvent(e: SessionEvent): string {
  if ('kind' in e) {
    if (e.kind === 'prompt') return `User: ${e.text}`
    if (e.kind === 'action') {
      return `${e.tool}(${JSON.stringify(e.input)}) → ${e.output}`
    }
  }
  return e.output ?? ''
}

export function enforceTdd() {
  return async (action: Action, rawCtx?: unknown) => {
    if (action.type !== 'write') return { kind: 'pass' as const }
    const ctx = rawCtx as RuleContext
    const events = (await ctx.history?.()) ?? []
    const historyBlock = events.map(formatEvent).filter(Boolean).join('\n')
    const prompt = [
      SYSTEM_RUBRIC,
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
