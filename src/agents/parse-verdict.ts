import { z } from 'zod'

import type { Verdict } from '../rule.js'

const VerdictSchema = z.object({
  verdict: z.enum(['pass', 'violation']),
  reason: z.string(),
})

/**
 * Parses a validator's raw text response into a Verdict. Fail-closed:
 * any parse failure or shape mismatch collapses to a `violation`
 * verdict with the offending text (first 200 chars) as the reason.
 * Shared across AI providers (Claude, Codex, Copilot) since all of
 * them return free-form text that our rubric tells them should be a
 * single JSON object.
 */
export function parseVerdict(text: string): Verdict {
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
