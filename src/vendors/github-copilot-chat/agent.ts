import type { Agent } from '../../types.js'

/**
 * The Copilot Chat extension doesn't expose its underlying LLM via an
 * SDK we can call from a hook, so AI-judged rules (like enforceTdd)
 * effectively no-op on this surface. The factory returns an Agent
 * whose reason() always passes.
 */
export function githubCopilotChat(): Agent {
  return {
    reason: async () => ({ verdict: 'pass', reason: '' }),
  }
}
