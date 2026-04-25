import type { AiClient, Verdict } from '../rule.js'
import { parseVerdict } from './parse-verdict.js'

type ThreadOptions = {
  skipGitRepoCheck?: boolean
  sandboxMode?: 'read-only' | 'workspace-write' | 'danger-full-access'
  approvalPolicy?: 'never' | 'on-request' | 'on-failure' | 'untrusted'
  networkAccessEnabled?: boolean
  webSearchEnabled?: boolean
}

type CodexLike = {
  startThread(options?: ThreadOptions): {
    run(input: string): Promise<{ finalResponse: string }>
  }
}

export function codexSdk(options: { codexFactory: () => CodexLike }): AiClient {
  return {
    reason: async (prompt: string): Promise<Verdict> => {
      let text: string
      try {
        const codex = options.codexFactory()
        const thread = codex.startThread({
          skipGitRepoCheck: true,
          sandboxMode: 'read-only',
          approvalPolicy: 'never',
          networkAccessEnabled: false,
          webSearchEnabled: false,
        })
        const turn = await thread.run(prompt)
        text = turn.finalResponse
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        return { verdict: 'violation', reason }
      }
      return parseVerdict(text)
    },
  }
}
