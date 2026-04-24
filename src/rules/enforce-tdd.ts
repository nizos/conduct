import type { Action } from '../rule.js'

type Verdict = { verdict: 'pass' | 'violation'; reason: string }

type RuleContext = {
  ai: {
    reason: (input: { prompt: string }) => Promise<Verdict>
  }
}

export function enforceTdd() {
  return async (action: Action, ctx: RuleContext) => {
    if (action.type !== 'write') return { kind: 'pass' as const }
    const prompt = `File: ${action.path}\n\n${action.content}`
    const v = await ctx.ai.reason({ prompt })
    if (v.verdict === 'violation') {
      return { kind: 'violation' as const, reason: v.reason }
    }
    return { kind: 'pass' as const }
  }
}
