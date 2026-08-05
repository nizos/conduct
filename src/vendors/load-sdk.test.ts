import { describe, it, expect } from 'vitest'

import { loadSdk } from './load-sdk.js'

describe('loadSdk', () => {
  it('resolves the module when the injected importer succeeds', async () => {
    const fakeModule = { query: () => {} }
    const result = await loadSdk('@openai/codex-sdk', () =>
      Promise.resolve(fakeModule),
    )

    expect(result).toBe(fakeModule)
  })

  it('throws a friendly, actionable error when the SDK is missing', async () => {
    const notFound = Object.assign(
      new Error(
        "Cannot find package '@openai/codex-sdk' imported from probity",
      ),
      { code: 'ERR_MODULE_NOT_FOUND' },
    )

    await expect(
      loadSdk('@openai/codex-sdk', () => Promise.reject(notFound)),
    ).rejects.toThrow(/@openai\/codex-sdk/)
    await expect(
      loadSdk('@openai/codex-sdk', () => Promise.reject(notFound)),
    ).rejects.toThrow(/npm install -D @openai\/codex-sdk/)
  })

  it('names the exact specifier requested, not some other package', async () => {
    const notFound = Object.assign(
      new Error(
        "Cannot find package '@github/copilot-sdk' imported from probity",
      ),
      { code: 'ERR_MODULE_NOT_FOUND' },
    )

    await expect(
      loadSdk('@github/copilot-sdk', () => Promise.reject(notFound)),
    ).rejects.toThrow(/@github\/copilot-sdk/)
  })

  it('re-throws a non-ERR_MODULE_NOT_FOUND error untouched', async () => {
    const syntaxError = new SyntaxError('Unexpected token in module')

    await expect(
      loadSdk('@openai/codex-sdk', () => Promise.reject(syntaxError)),
    ).rejects.toBe(syntaxError)
  })

  it('re-throws a transitive ERR_MODULE_NOT_FOUND untouched (different specifier)', async () => {
    const transitive = Object.assign(
      new Error("Cannot find package 'some-deep-dependency' imported from"),
      { code: 'ERR_MODULE_NOT_FOUND' },
    )

    await expect(
      loadSdk('@openai/codex-sdk', () => Promise.reject(transitive)),
    ).rejects.toBe(transitive)
  })

  it('uses the real dynamic import by default', async () => {
    await expect(loadSdk('@definitely/not-a-real-package-xyz')).rejects.toThrow(
      /npm install -D @definitely\/not-a-real-package-xyz/,
    )
  })
})
