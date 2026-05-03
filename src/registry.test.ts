import { describe, it, expect } from 'vitest'

import { vendors, isVendor } from './registry.js'
import { claudeCode } from './vendors/claude-code/agent.js'
import * as claudeCodeAdapter from './vendors/claude-code/adapter.js'
import { toCanonical as claudeCodeToCanonical } from './vendors/claude-code/event.js'
import { readTranscript as readClaudeCodeTranscript } from './vendors/claude-code/transcript.js'
import { codex } from './vendors/codex/agent.js'
import * as codexAdapter from './vendors/codex/adapter.js'
import { toCanonical as codexToCanonical } from './vendors/codex/event.js'
import { readTranscript as readCodexTranscript } from './vendors/codex/transcript.js'
import { githubCopilot } from './vendors/github-copilot/agent.js'
import * as githubCopilotAdapter from './vendors/github-copilot/adapter.js'
import { toCanonical as githubCopilotToCanonical } from './vendors/github-copilot/event.js'
import { readTranscript as readGithubCopilotTranscript } from './vendors/github-copilot/transcript.js'
import * as githubCopilotChatAdapter from './vendors/github-copilot-chat/adapter.js'
import { toCanonical as githubCopilotChatToCanonical } from './vendors/github-copilot-chat/event.js'
import { readTranscript as readGithubCopilotChatTranscript } from './vendors/github-copilot-chat/transcript.js'

describe('isVendor', () => {
  it('accepts a known agent name', () => {
    expect(isVendor('claude-code')).toBe(true)
  })

  it('rejects an unknown string', () => {
    expect(isVendor('bogus')).toBe(false)
  })

  it('rejects a non-string value', () => {
    expect(isVendor(undefined)).toBe(false)
  })

  it('rejects names inherited from Object.prototype', () => {
    expect(isVendor('toString')).toBe(false)
    expect(isVendor('hasOwnProperty')).toBe(false)
  })
})

describe('vendors registry', () => {
  it('wires the claude-code adapter module', () => {
    expect(vendors['claude-code'].adapter).toBe(claudeCodeAdapter)
  })

  it('wires the claude-code agent factory', () => {
    expect(vendors['claude-code'].agent).toBe(claudeCode)
  })

  it('wires the claude-code transcript reader', () => {
    expect(vendors['claude-code'].readTranscript).toBe(readClaudeCodeTranscript)
  })

  it('wires the claude-code canonical-event classifier', () => {
    expect(vendors['claude-code'].toCanonical).toBe(claudeCodeToCanonical)
  })

  it('wires the codex adapter module', () => {
    expect(vendors['codex'].adapter).toBe(codexAdapter)
  })

  it('wires the codex agent factory', () => {
    expect(vendors['codex'].agent).toBe(codex)
  })

  it('wires the codex transcript reader', () => {
    expect(vendors['codex'].readTranscript).toBe(readCodexTranscript)
  })

  it('wires the codex canonical-event classifier', () => {
    expect(vendors['codex'].toCanonical).toBe(codexToCanonical)
  })

  it('wires the github-copilot adapter module', () => {
    expect(vendors['github-copilot'].adapter).toBe(githubCopilotAdapter)
  })

  it('wires the github-copilot agent factory', () => {
    expect(vendors['github-copilot'].agent).toBe(githubCopilot)
  })

  it('wires the github-copilot transcript reader', () => {
    expect(vendors['github-copilot'].readTranscript).toBe(
      readGithubCopilotTranscript,
    )
  })

  it('wires the github-copilot canonical-event classifier', () => {
    expect(vendors['github-copilot'].toCanonical).toBe(githubCopilotToCanonical)
  })

  it('wires the github-copilot-chat adapter module', () => {
    expect(vendors['github-copilot-chat'].adapter).toBe(
      githubCopilotChatAdapter,
    )
  })

  it('shares the github-copilot agent factory with the chat surface (same SDK)', () => {
    expect(vendors['github-copilot-chat'].agent).toBe(githubCopilot)
  })

  it('wires the github-copilot-chat transcript reader', () => {
    expect(vendors['github-copilot-chat'].readTranscript).toBe(
      readGithubCopilotChatTranscript,
    )
  })

  it('wires the github-copilot-chat canonical-event classifier', () => {
    expect(vendors['github-copilot-chat'].toCanonical).toBe(
      githubCopilotChatToCanonical,
    )
  })
})
