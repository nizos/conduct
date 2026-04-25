import type { ThreadOptions } from '@openai/codex-sdk'

import type { Agent } from '../rule.js'
import { toVerdict } from './to-verdict.js'

type CodexLike = {
  startThread(options?: ThreadOptions): {
    run(input: string): Promise<{ finalResponse: string }>
  }
}

export function codexSdk(options: { codexFactory: () => CodexLike }): Agent {
  return {
    reason: (prompt) =>
      toVerdict(async () => {
        const thread = options.codexFactory().startThread({
          skipGitRepoCheck: true,
          sandboxMode: 'read-only',
          approvalPolicy: 'never',
          networkAccessEnabled: false,
          webSearchEnabled: false,
        })
        const turn = await thread.run(prompt)
        return turn.finalResponse
      }),
  }
}
