import type { Agent } from '../rule.js'
import { aiClientFromText } from './ai-client-from-text.js'

type SessionConfig = {
  availableTools?: string[]
  onPermissionRequest?: unknown
}

type CopilotClientLike = {
  start(): Promise<void>
  createSession(config: SessionConfig): Promise<{
    sendAndWait(args: {
      prompt: string
    }): Promise<{ data: { content: string } } | undefined>
  }>
  stop(): Promise<unknown>
}

export function githubCopilotSdk(options: {
  copilotClientFactory: () => CopilotClientLike
  onPermissionRequest?: unknown
}): Agent {
  return aiClientFromText(async (prompt) => {
    const client = options.copilotClientFactory()
    await client.start()
    const session = await client.createSession({
      availableTools: [],
      onPermissionRequest: options.onPermissionRequest,
    })
    const event = await session.sendAndWait({ prompt })
    await client.stop()
    if (!event) {
      throw new Error(
        'no response from copilot: sendAndWait returned undefined',
      )
    }
    return event.data.content
  })
}
