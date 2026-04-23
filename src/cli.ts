import path from 'node:path'

import type { PreToolUseHookInput } from '@anthropic-ai/claude-agent-sdk'

import { toAction, toResponse } from './adapter/claude-code'
import { loadConfig } from './config'
import { evaluate } from './engine'

export async function run(rawPayload: string): Promise<string> {
  const payload = JSON.parse(rawPayload) as PreToolUseHookInput
  const action = toAction(payload)
  const config = await loadConfig(path.resolve('conduct.config.ts'))
  const decision = evaluate(action, config.rules)
  return toResponse(decision)
}
