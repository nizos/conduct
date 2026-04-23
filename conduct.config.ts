import { defineConfig } from './src/config'
import { configure } from './src/engine'
import { filenameCasing } from './src/rules/filename-casing'

export default defineConfig({
  rules: [configure(filenameCasing, { style: 'kebab-case' })],
})
