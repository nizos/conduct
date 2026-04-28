import { describe, it, expect } from 'vitest'

import { githubCopilotChat } from './agent.js'

describe('github-copilot-chat agent', () => {
  it('returns an agent whose reason() always passes (no SDK available for Chat)', async () => {
    const agent = githubCopilotChat()

    const verdict = await agent.reason('any prompt')

    expect(verdict).toEqual({ verdict: 'pass', reason: '' })
  })
})
