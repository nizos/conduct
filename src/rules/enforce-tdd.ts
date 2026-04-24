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

Rule: production code may only be introduced to satisfy a failing test.
Block when the agent writes production code without a failing test that
drives it, or when the implementation clearly exceeds the minimum needed
to make the failing test pass.`

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
  return async (action: Action, ctx: RuleContext) => {
    if (action.type !== 'write') return { kind: 'pass' as const }
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
