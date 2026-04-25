import type { AiClient } from '../rule.js'
import { aiClientFromText } from './ai-client-from-text.js'

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
