import type { ThreadOptions } from '@openai/codex-sdk'

import type { Agent } from '../../rule.js'
import { toVerdict } from '../to-verdict.js'

type CodexLike = {
  startThread(options?: ThreadOptions): {
    run(input: string): Promise<{ finalResponse: string }>
  }
}

export function codex(deps: { codex?: CodexLike } = {}): Agent {
  return {
    reason: (prompt) =>
      toVerdict(async () => {
        const instance = deps.codex ?? (await loadDefaultCodex())
        const thread = instance.startThread({
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

async function loadDefaultCodex(): Promise<CodexLike> {
  const mod = await import('@openai/codex-sdk')
  return new mod.Codex()
}
