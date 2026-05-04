import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, it, expect, onTestFinished } from 'vitest'

import { applyEdit } from './apply-edit.js'

describe('applyEdit', () => {
  it('returns the post-edit content when oldString appears exactly once', async () => {
    const filePath = await setupFile('before\nMARKER\nafter\n')

    const result = await applyEdit({
      filePath,
      oldString: 'MARKER',
      newString: 'REPLACED',
    })

    expect(result).toEqual({ ok: true, content: 'before\nREPLACED\nafter\n' })
  })

  it('fails closed when oldString does not appear in the file (no silent no-op)', async () => {
    const filePath = await setupFile('a fresh file with no marker in it\n')

    const result = await applyEdit({
      filePath,
      oldString: 'MARKER',
      newString: 'REPLACED',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/not found|no match|MARKER/i)
  })

  it('fails closed when oldString matches more than once and replaceAll is false (mirrors vendor uniqueness contract)', async () => {
    const filePath = await setupFile('one MARKER\ntwo MARKER\nthree MARKER\n')

    const result = await applyEdit({
      filePath,
      oldString: 'MARKER',
      newString: 'REPLACED',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/unique|multiple|3/i)
  })

  it('replaces every occurrence of oldString when replaceAll is true', async () => {
    const filePath = await setupFile('one MARKER\ntwo MARKER\nthree MARKER\n')

    const result = await applyEdit({
      filePath,
      oldString: 'MARKER',
      newString: 'REPLACED',
      replaceAll: true,
    })

    expect(result).toEqual({
      ok: true,
      content: 'one REPLACED\ntwo REPLACED\nthree REPLACED\n',
    })
  })

  it('fails closed when the file does not exist (no silent fallback to newString)', async () => {
    const result = await applyEdit({
      filePath: '/tmp/probity-apply-edit-does-not-exist.ts',
      oldString: 'MARKER',
      newString: 'REPLACED',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/not.*read|missing|ENOENT/i)
  })
})

async function setupFile(content: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'apply-edit-'))
  onTestFinished(() => rm(dir, { recursive: true, force: true }))
  const filePath = path.join(dir, 'foo.ts')
  await writeFile(filePath, content)
  return filePath
}
