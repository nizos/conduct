import { defineConfig } from './src/config'
import { filenameCasing } from './src/rules/filename-casing'

export default defineConfig({
  rules: [filenameCasing({ style: 'kebab-case' })],
})
