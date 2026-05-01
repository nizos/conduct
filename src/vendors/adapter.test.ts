import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import type { Action } from '../types.js'
import { fromSchema, passthroughFor } from './adapter.js'

describe('fromSchema', () => {
  it('wraps a Zod schema into a parseAction returning {ok: true, action} for valid input', () => {
    const schema = z
      .object({ kind: z.literal('command'), command: z.string() })
      .transform((d): Action => ({ type: 'command', command: d.command }))

    const parse = fromSchema(schema as unknown as z.ZodType<Action>)

    expect(parse({ kind: 'command', command: 'echo hi' })).toEqual({
      ok: true,
      action: { type: 'command', command: 'echo hi' },
    })
  })

  it('returns {ok: false, reason} formed from the joined Zod issue messages on invalid input', () => {
    const schema = z
      .object({ kind: z.literal('command'), command: z.string() })
      .transform((d): Action => ({ type: 'command', command: d.command }))

    const parse = fromSchema(schema as unknown as z.ZodType<Action>)
    const result = parse({ kind: 'wrong' })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unreachable')
    expect(result.reason).toMatch(/literal|kind|command/i)
  })
})

describe('passthroughFor', () => {
  it('produces a schema that accepts an unknown tool name and yields a no-op command action', () => {
    const schema = passthroughFor('tool_name', ['Bash', 'Edit', 'Write'])

    const action = schema.parse({ tool_name: 'MultiEdit' })

    expect(action).toEqual({ type: 'command', command: '' })
  })
})
