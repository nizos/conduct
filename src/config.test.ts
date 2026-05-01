import path from 'node:path'

import { describe, it, expect } from 'vitest'

import { defineConfig, findConfig, loadConfig } from './config.js'

describe('defineConfig', () => {
  it('returns the config as-is', () => {
    const config = defineConfig({ rules: [] })

    expect(config).toEqual({ rules: [] })
  })
})

describe('loadConfig', () => {
  it('loads a config file by path', async () => {
    const fixture = path.resolve('test/fixtures/config/empty.config.ts')

    const config = await loadConfig(fixture)

    expect(config).toEqual({ rules: [] })
  })

  it('leaves a `**`-prefixed glob unanchored (its intent is match-anywhere, not scope-to-config-dir)', async () => {
    const fixture = path.resolve('test/fixtures/configs/blocks.config.ts')

    const config = await loadConfig(fixture)

    expect(config.rules[0]).toMatchObject({
      files: ['**/src/**'],
    })
  })

  it('preserves the leading `!` and anchors the rest of a negation glob', async () => {
    const fixture = path.resolve('test/fixtures/configs/negation.config.ts')

    const config = await loadConfig(fixture)

    expect(config.rules[0]).toMatchObject({
      files: ['!' + path.posix.join(path.dirname(fixture), 'src/foo.ts')],
    })
  })

  it('leaves a `!**`-prefixed glob unanchored (its intent is exclude-anywhere)', async () => {
    const fixture = path.resolve(
      'test/fixtures/configs/negation-double-star.config.ts',
    )

    const config = await loadConfig(fixture)

    expect(config.rules[0]).toMatchObject({
      files: ['!**/foo.test.ts'],
    })
  })
})

describe('findConfig', () => {
  it('walks up from the start dir until it finds conduct.config.ts', () => {
    const startDir = path.resolve('test/fixtures/config/discovery/subdir')

    const result = findConfig(startDir)

    expect(result).toBe(
      path.resolve('test/fixtures/config/discovery/conduct.config.ts'),
    )
  })

  it('throws when no config is found up to the filesystem root', () => {
    expect(() => findConfig('/tmp')).toThrow(/conduct\.config\.ts/)
  })
})
