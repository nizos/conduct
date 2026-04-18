import path from 'node:path'

import { defineConfig } from 'vitest/config'

const root = path.resolve(import.meta.dirname)

export default defineConfig({
  test: {
    reporters: ['default', ['tdd-guard-vitest', { projectRoot: root }]],
  },
})
