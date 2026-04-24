type RuleContext = {
  ai: {
    reason: (input: { prompt: string }) => Promise<{ reason: string }>
  }
}

export function enforceTdd() {
  return async (_action: unknown, ctx: RuleContext) => {
    const verdict = await ctx.ai.reason({ prompt: '' })
    return { kind: 'violation' as const, reason: verdict.reason }
  }
}
