import type { Agent } from '../rule.js'
import { toVerdict } from './to-verdict.js'

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

export function githubCopilot(
  deps: {
    client?: CopilotClientLike
    onPermissionRequest?: unknown
  } = {},
): Agent {
  return {
    reason: (prompt) =>
      toVerdict(async () => {
        const { client, onPermissionRequest } = await resolveClient(deps)
        await client.start()
        const session = await client.createSession({
          availableTools: [],
          onPermissionRequest,
        })
        const event = await session.sendAndWait({ prompt })
        await client.stop()
        if (!event) {
          throw new Error(
            'no response from copilot: sendAndWait returned undefined',
          )
        }
        return event.data.content
      }),
  }
}

async function resolveClient(deps: {
  client?: CopilotClientLike
  onPermissionRequest?: unknown
}): Promise<{ client: CopilotClientLike; onPermissionRequest?: unknown }> {
  if (deps.client) {
    return {
      client: deps.client,
      onPermissionRequest: deps.onPermissionRequest,
    }
  }
  const mod = await import('@github/copilot-sdk')
  return {
    client: new mod.CopilotClient({}),
    onPermissionRequest: deps.onPermissionRequest ?? mod.approveAll,
  }
}
