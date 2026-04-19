import type { PreToolUseHookInput } from '@anthropic-ai/claude-agent-sdk'

import { toAction, toResponse } from './adapter/claude-code'
import { configure, evaluate } from './engine'
import { filenameCasing } from './rules/filename-casing'

export function run(rawPayload: string): string {
  const payload = JSON.parse(rawPayload) as PreToolUseHookInput
  const action = toAction(payload)
  const rules = [configure(filenameCasing, { style: 'kebab-case' })]
  const decision = evaluate(action, rules)
  return toResponse(decision)
}
