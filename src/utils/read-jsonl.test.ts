import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, it, expect, onTestFinished } from 'vitest'

import { readJsonl } from './read-jsonl.js'

describe('readJsonl', () => {
  it('returns one parsed entry per non-empty line', async () => {
    const entries = await readJsonl('test/fixtures/transcripts/basic.jsonl')

    expect(entries.length).toBeGreaterThan(0)
  })

  it('refuses to read a file larger than maxBytes', async () => {
    await expect(
      readJsonl('test/fixtures/transcripts/basic.jsonl', { maxBytes: 0 }),
    ).rejects.toThrow(/bytes|exceeds/i)
  })

  it('refuses to read a symbolic link', async () => {
    const dir = await setupTempDir()
    const target = path.join(dir, 'real.jsonl')
    const link = path.join(dir, 'link.jsonl')
    await writeFile(target, '{"a":1}\n')
    await symlink(target, link)

    await expect(readJsonl(link)).rejects.toThrow(/symlink|symbolic/i)
  })
})

async function setupTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'probity-read-jsonl-'))
  onTestFinished(async () => {
    await rm(dir, { recursive: true, force: true })
  })
  return dir
}
