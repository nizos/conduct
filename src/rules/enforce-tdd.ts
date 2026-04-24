import type { Action } from '../rule.js'

type Verdict = { verdict: 'pass' | 'violation'; reason: string }

type SessionEvent = { output?: string }

type RuleContext = {
  ai: {
    reason: (prompt: string) => Promise<Verdict>
  }
  history?: () => Promise<SessionEvent[]>
}

export function enforceTdd() {
  return async (action: Action, ctx: RuleContext) => {
    if (action.type !== 'write') return { kind: 'pass' as const }
    const events = (await ctx.history?.()) ?? []
    const historyBlock = events
      .map((e) => e.output ?? '')
      .filter(Boolean)
      .join('\n')
    const prompt = [
      historyBlock && `Recent session:\n${historyBlock}`,
      `File: ${action.path}\n\n${action.content}`,
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
