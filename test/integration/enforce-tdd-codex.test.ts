import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, it, expect, onTestFinished } from 'vitest'

import { vendors } from '../../src/registry.js'
import { dispatch } from '../../src/cli.js'
import { enforceTdd } from '../../src/rules/enforce-tdd.js'

const runAi = process.env.CONDUCT_INTEGRATION_AI === '1'
const entry = vendors['codex']

describe.skipIf(!runAi)(
  'enforce-tdd + codex (integration with real AI)',
  () => {
    it('allows clean TDD with minimal implementation', async () => {
      const { decision } = await setup({
        transcript: 'test/fixtures/transcripts/codex-tdd-test-failed.jsonl',
        pendingContent: MINIMAL_IMPL,
      })

      expect(decision).toBe('allow')
    }, 60000)

    it('blocks clear over-implementation', async () => {
      const { decision } = await setup({
        transcript: 'test/fixtures/transcripts/codex-tdd-test-failed.jsonl',
        pendingContent: OVER_IMPL,
      })

      expect(decision).toBe('block')
    }, 60000)

    it('blocks implementation when the failing test has not been run', async () => {
      const { decision } = await setup({
        transcript: 'test/fixtures/transcripts/codex-tdd-no-test-run.jsonl',
        pendingContent: MINIMAL_IMPL,
      })

      expect(decision).toBe('block')
    }, 60000)

    it('allows adding a second test to an existing test file', async () => {
      const { decision } = await setup({
        transcript: 'test/fixtures/transcripts/codex-tdd-test-failed.jsonl',
        beforeFile: EXISTING_TEST_CONTENT,
        pendingContent: PLUS_ONE_TEST,
      })

      expect(decision).toBe('allow')
    }, 60000)

    it('blocks when two new tests are added in a single write', async () => {
      const { decision } = await setup({
        transcript: 'test/fixtures/transcripts/codex-tdd-test-failed.jsonl',
        beforeFile: EXISTING_TEST_CONTENT,
        pendingContent: PLUS_TWO_TESTS,
      })

      expect(decision).toBe('block')
    }, 60000)
  },
)

function inferFilename(content: string): string {
  return /describe\(|\bit\(/.test(content) ? 'target.test.ts' : 'target.ts'
}

async function setup(opts: {
  transcript: string
  pendingContent: string
  beforeFile?: string
}): Promise<{ decision: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), 'enforce-tdd-codex-'))
  onTestFinished(async () => {
    await rm(dir, { recursive: true, force: true })
  })
  const filePath = path.join(dir, inferFilename(opts.pendingContent))
  if (opts.beforeFile !== undefined) {
    await writeFile(filePath, opts.beforeFile)
  }
  const patch = makeAddFilePatch(filePath, opts.pendingContent)
  const payload = JSON.stringify({
    session_id: 'integration-codex',
    turn_id: 'integration-codex-turn',
    transcript_path: opts.transcript,
    cwd: '/workspaces/conduct',
    hook_event_name: 'PreToolUse',
    model: 'gpt-5.5',
    permission_mode: 'default',
    tool_name: 'apply_patch',
    tool_input: { command: patch },
    tool_use_id: 'call_integration_codex',
  })
  const agent = entry.agent()
  const response = await dispatch(entry, payload, [enforceTdd()], agent)
  const parsed = response ? JSON.parse(response) : {}
  return { decision: parsed.decision ?? 'allow' }
}

function makeAddFilePatch(filePath: string, content: string): string {
  const body = content
    .split('\n')
    .map((line) => `+${line}`)
    .join('\n')
  return `*** Begin Patch\n*** Add File: ${filePath}\n${body}\n*** End Patch\n`
}

const EXISTING_TEST_CONTENT = `import { describe, expect, it } from 'vitest'
import { add } from './calculator.js'

describe('calculator', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })
})`

const PLUS_ONE_TEST = `import { describe, expect, it } from 'vitest'
import { add } from './calculator.js'

describe('calculator', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })

  it('adds negative numbers', () => {
    expect(add(-1, -1)).toBe(-2)
  })
})`

const PLUS_TWO_TESTS = `import { describe, expect, it } from 'vitest'
import { add } from './calculator.js'

describe('calculator', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })

  it('adds negative numbers', () => {
    expect(add(-1, -1)).toBe(-2)
  })

  it('adds zeros', () => {
    expect(add(0, 0)).toBe(0)
  })
})`

const MINIMAL_IMPL = `export function add(a: number, b: number): number {
  return a + b
}`

const OVER_IMPL = `export function add(a: number, b: number): number {
  return a + b
}
export function subtract(a: number, b: number): number {
  return a - b
}
export function multiply(a: number, b: number): number {
  return a * b
}
export function divide(a: number, b: number): number {
  if (b === 0) throw new Error('division by zero')
  return a / b
}
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
}`
