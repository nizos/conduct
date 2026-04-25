import type { AiClient } from '../rule.js'
import { aiClientFromText } from './ai-client-from-text.js'

type CopilotClientLike = {
  start(): Promise<void>
  createSession(config: { availableTools?: string[] }): Promise<{
    sendAndWait(args: {
      prompt: string
    }): Promise<{ data: { content: string } }>
  }>
  stop(): Promise<unknown>
}

export function githubCopilotSdk(options: {
  copilotClientFactory: () => CopilotClientLike
}): AiClient {
  return aiClientFromText(async (prompt) => {
    const client = options.copilotClientFactory()
    await client.start()
    const session = await client.createSession({ availableTools: [] })
    const event = await session.sendAndWait({ prompt })
    await client.stop()
    return event.data.content
  })
}
