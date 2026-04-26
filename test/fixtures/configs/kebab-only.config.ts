import { defineConfig, enforceFilenameCasing } from '../../../src/index.js'

export default defineConfig({
  rules: [
    enforceFilenameCasing({
      style: 'kebab-case',
      paths: ['**/src/**', '**/test/**'],
    }),
  ],
})
