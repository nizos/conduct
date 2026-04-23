import { readFileSync } from 'node:fs'

import { describe, it, expect } from 'vitest'

import { toAction } from './github-copilot.js'

describe('github-copilot adapter', () => {
  it('tags the action type as command for a bash payload', () => {
    const { action } = setup('bash-npm-install.json')

    expect(action.type).toBe('command')
  })

  it('extracts the command text from a bash payload', () => {
    const { action, payload } = setup('bash-npm-install.json')
    const toolArgs = JSON.parse(payload.toolArgs) as { command: string }

    expect(action).toMatchObject({ command: toolArgs.command })
  })
})

function setup(fixtureName: string) {
  const payload = JSON.parse(
    readFileSync(`test/fixtures/github-copilot/${fixtureName}`, 'utf8'),
  )
  const action = toAction(payload)
  return { action, payload }
}
