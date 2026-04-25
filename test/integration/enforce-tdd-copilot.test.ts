import { mkdtemp, mkdir, cp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, it, expect } from 'vitest'

import { vendors } from '../../src/registry.js'
import { dispatch } from '../../src/cli.js'
import type { Agent } from '../../src/rule.js'
import { enforceTdd } from '../../src/rules/enforce-tdd.js'

const runAi = process.env.CONDUCT_INTEGRATION_AI === '1'
const entry = vendors['github-copilot']
const copilot = entry.adapter

const CLEAN_SESSION = 'integration-copilot-tdd-clean'
const NO_RUN_SESSION = 'integration-copilot-tdd-no-run'

describe.skipIf(!runAi)('enforce-tdd + github-copilot (integration)', () => {
  let home: string
  let prevHome: string | undefined
  let agent: Agent

  beforeAll(async () => {
    agent = entry.agent()
    home = await mkdtemp(path.join(tmpdir(), 'conduct-copilot-tdd-'))
    for (const [session, fixture] of [
      [CLEAN_SESSION, 'copilot-tdd-clean.jsonl'],
      [NO_RUN_SESSION, 'copilot-tdd-no-test-run.jsonl'],
    ] as const) {
      const sessionDir = path.join(home, 'session-state', session)
      await mkdir(sessionDir, { recursive: true })
      await cp(
        `test/fixtures/transcripts/${fixture}`,
        path.join(sessionDir, 'events.jsonl'),
      )
    }
    prevHome = process.env.COPILOT_HOME
    process.env.COPILOT_HOME = home
  })

  afterAll(async () => {
    if (prevHome === undefined) delete process.env.COPILOT_HOME
    else process.env.COPILOT_HOME = prevHome
    await rm(home, { recursive: true, force: true })
  })

  it('allows a minimal add implementation after a failing test was run', async () => {
    const payload = buildCreatePayload({
      sessionId: CLEAN_SESSION,
      file_path: '/workspaces/conduct/src/calculator.ts',
      file_text:
        'export function add(a: number, b: number): number {\n  return a + b\n}\n',
    })

    const response = await dispatch(copilot, payload, [enforceTdd()], agent)
    const parsed = JSON.parse(response)

    expect(parsed.permissionDecision).toBe('allow')
  }, 60000)

  it('blocks an over-implementation that adds many unrequested functions', async () => {
    const payload = buildCreatePayload({
      sessionId: CLEAN_SESSION,
      file_path: '/workspaces/conduct/src/calculator.ts',
      file_text: OVER_IMPL,
    })

    const response = await dispatch(copilot, payload, [enforceTdd()], agent)
    const parsed = JSON.parse(response)

    expect(parsed.permissionDecision).toBe('deny')
  }, 60000)

  it('blocks implementation when the failing test has not been run', async () => {
    const payload = buildCreatePayload({
      sessionId: NO_RUN_SESSION,
      file_path: '/workspaces/conduct/src/calculator.ts',
      file_text:
        'export function add(a: number, b: number): number {\n  return a + b\n}\n',
    })

    const response = await dispatch(copilot, payload, [enforceTdd()], agent)
    const parsed = JSON.parse(response)

    expect(parsed.permissionDecision).toBe('deny')
  }, 60000)
})

const OVER_IMPL = `export function add(a: number, b: number): number { return a + b }
export function subtract(a: number, b: number): number { return a - b }
export function multiply(a: number, b: number): number { return a * b }
export function divide(a: number, b: number): number {
  if (b === 0) throw new Error('division by zero')
  return a / b
}
export function power(a: number, b: number): number { return Math.pow(a, b) }
export function sqrt(a: number): number { return Math.sqrt(a) }

export class Calculator {
  private history: Array<{ op: string; result: number }> = []
  add(a: number, b: number): number {
    const r = a + b
    this.history.push({ op: 'add', result: r })
    return r
  }
  clear(): void {
    this.history = []
  }
}
`

function buildCreatePayload(opts: {
  sessionId: string
  file_path: string
  file_text: string
}): string {
  return JSON.stringify({
    sessionId: opts.sessionId,
    timestamp: Date.now(),
    cwd: '/workspaces/conduct',
    toolName: 'create',
    toolArgs: JSON.stringify({
      path: opts.file_path,
      file_text: opts.file_text,
    }),
  })
}
