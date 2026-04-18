import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { toAction } from './claude-code.js'

describe('claude-code adapter', () => {
  it('extracts the file path from a Write payload', () => {
    const { action, payload } = setup('write-new-file.json')

    expect(action.path).toBe(payload.tool_input.file_path)
  })

  it('tags the action type as write for a Write payload', () => {
    const { action } = setup('write-new-file.json')

    expect(action.type).toBe('write')
  })
})

function setup(fixtureName: string) {
  const payload = JSON.parse(
    readFileSync(`test/fixtures/claude-code/${fixtureName}`, 'utf8'),
  )
  const action = toAction(payload)
  return { action, payload }
}
