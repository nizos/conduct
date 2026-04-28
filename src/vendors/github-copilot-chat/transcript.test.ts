import { describe, it, expect } from 'vitest'

import { readTranscript } from './transcript.js'

describe('github-copilot-chat transcript', () => {
  it('returns an empty array (Chat transcript format not yet parsed)', async () => {
    const events = await readTranscript('/tmp/anything.jsonl')

    expect(events).toEqual([])
  })
})
