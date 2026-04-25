import { z } from 'zod'

/**
 * Zod schema that takes a string and parses it as JSON. Adds a
 * structured zod issue if parsing fails so callers can use safeParse
 * uniformly across the codebase.
 */
export const JsonString = z.string().transform((s, ctx): unknown => {
  try {
    return JSON.parse(s)
  } catch (e) {
    ctx.addIssue({
      code: 'custom',
      message: e instanceof Error ? e.message : String(e),
    })
    return z.NEVER
  }
})
