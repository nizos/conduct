import { defineConfig, enforceFilenameCasing } from '../../../src/index.js'

export default defineConfig({
  rules: [
    {
      files: ['**/src/**'],
      rules: [enforceFilenameCasing({ style: 'kebab-case' })],
    },
  ],
})
