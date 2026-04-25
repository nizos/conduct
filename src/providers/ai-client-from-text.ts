import type { Agent, Verdict } from '../rule.js'
import { parseVerdict } from './parse-verdict.js'

/**
 * Wraps a "give me text from a prompt" function as an Agent.
 * Centralises the fail-closed contract every AI provider shares: a
 * thrown getText becomes a `violation` verdict whose reason is the
 * error message; a returned string is fed through parseVerdict.
 *
 * Each provider (claudeAgentSdk, codexSdk, etc.) supplies the
 * vendor-specific transport logic — call the SDK, walk its event
 * stream, return the final response string — and lets this helper
 * own the verdict shape.
 */
export function aiClientFromText(
  getText: (prompt: string) => Promise<string>,
): Agent {
  return {
    reason: async (prompt: string): Promise<Verdict> => {
      let text: string
      try {
        text = await getText(prompt)
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        return { verdict: 'violation', reason }
      }
      return parseVerdict(text)
    },
  }
}
