import { defineConfig, enforceFilenameCasing } from '../../../src/index.js'

export default defineConfig({
  rules: [
    {
      files: ['**/src/**', '**/test/**'],
      rules: [enforceFilenameCasing({ style: 'kebab-case' })],
    },
  ],
})
