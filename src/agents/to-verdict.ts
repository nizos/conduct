import type { Verdict } from '../rule.js'
import { parseVerdict } from './parse-verdict.js'

/**
 * Turns a "give me text from the validator" call into a Verdict.
 * Centralises the fail-closed contract every agent shares: a thrown
 * getText becomes a `violation` verdict whose reason is the error
 * message; a returned string is fed through parseVerdict. Each agent
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
