type Verdict = { verdict: 'pass' | 'violation'; reason: string }

type RuleContext = {
  ai: {
    reason: (input: { prompt: string }) => Promise<Verdict>
  }
}

export function enforceTdd() {
  return async (_action: unknown, ctx: RuleContext) => {
    const v = await ctx.ai.reason({ prompt: '' })
    if (v.verdict === 'violation') {
      return { kind: 'violation' as const, reason: v.reason }
    }
    return { kind: 'pass' as const }
  }
}
