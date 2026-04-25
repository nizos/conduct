import { z } from 'zod'

import type { Verdict } from '../types.js'

const VerdictSchema = z.object({
  verdict: z.enum(['pass', 'violation']),
  reason: z.string(),
})

/**
 * Turns a "give me text from the validator" call into a Verdict.
 * Centralises the fail-closed contract every agent shares: a thrown
 * getText becomes a `violation` verdict whose reason is the error
 * message; the returned string is JSON-parsed (with optional ```json
 * fence stripping) and validated against the verdict shape, with
 * fail-closed for malformed or unexpected responses. Each agent
 * (claude-code, codex, github-copilot) supplies its own transport
 * closure and lets this helper own the verdict shape.
 */
export async function toVerdict(
  getText: () => Promise<string>,
): Promise<Verdict> {
  try {
    return parseVerdict(await getText())
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { verdict: 'violation', reason }
  }
}

function parseVerdict(text: string): Verdict {
  const parsed = tryParseJson(text)
  if (parsed === undefined) {
    return {
      verdict: 'violation',
      reason: `could not parse verdict from validator output: ${text.slice(0, 200)}`,
    }
  }
  const result = VerdictSchema.safeParse(parsed)
  if (!result.success) {
    return {
      verdict: 'violation',
      reason: `validator returned unexpected shape: ${text.slice(0, 200)}`,
    }
  }
  return result.data
}

function tryParseJson(text: string): unknown {
  // Fast path: most validator responses are already plain JSON.
  try {
    return JSON.parse(text.trim())
  } catch {
    // Fallback: strip an optional ```json fence and retry.
    try {
      return JSON.parse(
        text
          .replace(/^```(?:json)?\s*/, '')
          .replace(/\s*```$/, '')
          .trim(),
      )
    } catch {
      return undefined
    }
  }
}
