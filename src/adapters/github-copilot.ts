import type { Action, Decision } from '../rule.js'

export function toAction(payload: unknown): Action {
  const { toolArgs } = payload as { toolArgs: string }
  const { command } = JSON.parse(toolArgs) as { command: string }
  return { type: 'command', command }
}

export function toResponse(decision: Decision): string {
  if (decision.kind === 'block') {
    return JSON.stringify({
      permissionDecision: 'deny',
      permissionDecisionReason: decision.reason,
    })
  }
  // Per docs, only `deny` is currently processed by the CLI; `allow`
  // is emitted for compliance but doesn't bypass built-in confirmations.
  return JSON.stringify({ permissionDecision: 'allow' })
}
