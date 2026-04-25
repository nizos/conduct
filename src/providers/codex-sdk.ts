import type { ThreadOptions } from '@openai/codex-sdk'

import type { AiClient } from '../rule.js'
import { aiClientFromText } from './ai-client-from-text.js'

type CodexLike = {
  startThread(options?: ThreadOptions): {
    run(input: string): Promise<{ finalResponse: string }>
  }
}

export function codexSdk(options: { codexFactory: () => CodexLike }): AiClient {
  return aiClientFromText(async (prompt) => {
    const thread = options.codexFactory().startThread({
      skipGitRepoCheck: true,
      sandboxMode: 'read-only',
      approvalPolicy: 'never',
      networkAccessEnabled: false,
      webSearchEnabled: false,
    })
    const turn = await thread.run(prompt)
    return turn.finalResponse
  })
}
