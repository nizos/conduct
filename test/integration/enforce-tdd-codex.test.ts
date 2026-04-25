import { describe, it, expect } from 'vitest'

import { vendors } from '../../src/registry.js'
import { dispatch } from '../../src/cli.js'
import { enforceTdd } from '../../src/rules/enforce-tdd.js'

const runAi = process.env.CONDUCT_INTEGRATION_AI === '1'
const entry = vendors['codex']

describe.skipIf(!runAi)(
  'enforce-tdd + codex (integration with real AI)',
  () => {
    it('allows clean TDD with minimal implementation', async () => {
      const { agent } = setup()
      const payload = buildApplyPatchPayload({
        transcript: 'test/fixtures/transcripts/codex-tdd-test-failed.jsonl',
        patch: PATCH_MINIMAL_IMPL,
      })

      const response = await dispatch(entry, payload, [enforceTdd()], agent)
      const parsed = JSON.parse(response || '{}')

      expect(parsed.decision ?? 'allow').toBe('allow')
    }, 60000)

    it('blocks clear over-implementation', async () => {
      const { agent } = setup()
      const payload = buildApplyPatchPayload({
        transcript: 'test/fixtures/transcripts/codex-tdd-test-failed.jsonl',
        patch: PATCH_OVER_IMPL,
      })

      const response = await dispatch(entry, payload, [enforceTdd()], agent)
      const parsed = JSON.parse(response)

      expect(parsed.decision).toBe('block')
    }, 60000)

    it('blocks implementation when the failing test has not been run', async () => {
      const { agent } = setup()
      const payload = buildApplyPatchPayload({
        transcript: 'test/fixtures/transcripts/codex-tdd-no-test-run.jsonl',
        patch: PATCH_MINIMAL_IMPL,
      })

      const response = await dispatch(entry, payload, [enforceTdd()], agent)
      const parsed = JSON.parse(response)

      expect(parsed.decision).toBe('block')
    }, 60000)
  },
)

function setup() {
  return { agent: entry.agent() }
}

const PATCH_MINIMAL_IMPL = `*** Begin Patch
*** Add File: /workspaces/conduct/src/calculator.ts
+export function add(a: number, b: number): number {
+  return a + b
+}
*** End Patch
`

const PATCH_OVER_IMPL = `*** Begin Patch
*** Add File: /workspaces/conduct/src/calculator.ts
+export function add(a: number, b: number): number {
+  return a + b
+}
+export function subtract(a: number, b: number): number {
+  return a - b
+}
+export function multiply(a: number, b: number): number {
+  return a * b
+}
+export function divide(a: number, b: number): number {
+  if (b === 0) throw new Error('division by zero')
+  return a / b
+}
+export class Calculator {
+  private history: Array<{ op: string; result: number }> = []
+  add(a: number, b: number): number {
+    const r = a + b
+    this.history.push({ op: 'add', result: r })
+    return r
+  }
+  clear(): void {
+    this.history = []
+  }
+}
*** End Patch
`

function buildApplyPatchPayload(opts: {
  transcript: string
  patch: string
}): string {
  return JSON.stringify({
    session_id: 'integration-codex',
    turn_id: 'integration-codex-turn',
    transcript_path: opts.transcript,
    cwd: '/workspaces/conduct',
    hook_event_name: 'PreToolUse',
    model: 'gpt-5.5',
    permission_mode: 'default',
    tool_name: 'apply_patch',
    tool_input: { command: opts.patch },
    tool_use_id: 'call_integration_codex',
  })
}
