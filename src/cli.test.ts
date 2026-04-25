import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import { dispatch, run } from './cli.js'
import type { Config } from './config.js'
import { vendors, type VendorEntry } from './registry.js'
import type { Action, Agent } from './types.js'
import { filenameCasing } from './rules/filename-casing.js'

const claudeCodeEntry = vendors['claude-code']

const stubAgent: Agent = {
  reason: async () => ({ verdict: 'pass', reason: '' }),
}

describe('cli', () => {
  it('denies a write whose filename violates kebab-case', async () => {
    const { response } = await setup('write-new-file.json')

    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('allows a write whose filename matches kebab-case', async () => {
    const { response } = await setup('write-kebab-case.json')

    expect(response.hookSpecificOutput.permissionDecision).toBe('allow')
  })

  it('produces an empty allow response for a codex Bash payload that passes rules', async () => {
    const payload = readFileSync(
      'test/fixtures/codex/pre-bash-pwd.json',
      'utf8',
    )

    const response = await run(payload, {
      vendor: 'codex',
      loadConfig: async () => defaultTestConfig,
    })

    expect(response).toBe('')
  })

  it('produces an allow response for a github-copilot bash payload that passes rules', async () => {
    const payload = readFileSync(
      'test/fixtures/github-copilot/pre-bash-npm-test.json',
      'utf8',
    )

    const response = await run(payload, {
      vendor: 'github-copilot',
      loadConfig: async () => defaultTestConfig,
    })

    expect(JSON.parse(response)).toEqual({ permissionDecision: 'allow' })
  })

  it('returns a deny response when a rule crashes on the payload', async () => {
    const { response } = await setup('multi-edit.json')

    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('returns a deny response when the payload is not valid JSON', async () => {
    const response = await dispatch(
      claudeCodeEntry,
      'not json at all',
      [],
      stubAgent,
    )
    const parsed = JSON.parse(response)

    expect(parsed.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(parsed.hookSpecificOutput.permissionDecisionReason).toMatch(
      /json|parse/i,
    )
  })

  it('honors an injected config loader instead of discovering one on disk', async () => {
    const payload = readFileSync(
      'test/fixtures/claude-code/write-kebab-case.json',
      'utf8',
    )
    const injectedConfig: Config = {
      rules: [
        filenameCasing({
          style: 'kebab-case',
          paths: ['**/src/**', '**/test/**'],
        }),
      ],
      agent: stubAgent,
    }

    const raw = await run(payload, {
      vendor: 'claude-code',
      loadConfig: async () => injectedConfig,
    })
    const response = JSON.parse(raw)

    expect(response.hookSpecificOutput.permissionDecision).toBe('allow')
  })

  it('returns a deny response when the adapter actionSchema rejects the payload', async () => {
    const rejectingSchema = z.unknown().transform((_, ctx) => {
      ctx.addIssue({ code: 'custom', message: 'unsupported tool shape' })
      return z.NEVER
    }) as unknown as z.ZodType<Action>
    const rejectingEntry: VendorEntry = {
      ...claudeCodeEntry,
      adapter: {
        ...claudeCodeEntry.adapter,
        actionSchema: rejectingSchema,
      },
    }
    const payload = JSON.stringify({ tool_name: 'Bash', tool_input: {} })

    const response = await dispatch(rejectingEntry, payload, [], stubAgent)
    const parsed = JSON.parse(response)

    expect(parsed.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(parsed.hookSpecificOutput.permissionDecisionReason).toMatch(
      /payload|unsupported tool shape/i,
    )
  })
})

const defaultTestConfig: Config = {
  rules: [
    filenameCasing({
      style: 'kebab-case',
      paths: ['**/src/**', '**/test/**'],
    }),
  ],
  agent: stubAgent,
}

async function setup(fixtureName: string, config: Config = defaultTestConfig) {
  const payload = readFileSync(
    `test/fixtures/claude-code/${fixtureName}`,
    'utf8',
  )
  const raw = await run(payload, {
    vendor: 'claude-code',
    loadConfig: async () => config,
  })
  const response = JSON.parse(raw)
  return { response }
}
