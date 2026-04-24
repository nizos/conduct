import { describe, it } from 'vitest'

/*
 * Codex does not yet emit PreToolUse events for write actions.
 * Per the Codex hooks docs, PreToolUse currently fires for `Bash` only;
 * `apply_patch` interception (file edits) is listed as in-progress.
 *
 * enforceTdd operates on write actions (the validator judges whether a
 * pending file write follows TDD against the session history), so there
 * is no meaningful codex + enforceTdd integration to exercise until
 * write interception lands upstream.
 *
 * When it does:
 *   1. extend src/adapters/codex.ts toAction to accept the new tool_name
 *      + its tool_input shape (patch, path, content)
 *   2. mirror the copilot integration test shape (see
 *      enforce-tdd-copilot.test.ts) using a codex-tdd-clean.jsonl
 *      rollout fixture
 */
describe.skip('enforce-tdd + codex (integration — deferred)', () => {
  it.skip('pending Codex apply_patch PreToolUse support', () => {})
})
