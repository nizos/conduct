import path from 'node:path'

import { describe, it, expect } from 'vitest'

import { defineConfig, loadConfig } from './config'

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
})
