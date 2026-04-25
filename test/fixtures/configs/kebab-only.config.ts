import { defineConfig, filenameCasing } from '../../../src/index.js'

export default defineConfig({
  rules: [
    filenameCasing({
      style: 'kebab-case',
      paths: ['**/src/**', '**/test/**'],
    }),
  ],
})
