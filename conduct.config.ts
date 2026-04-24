import {
  defineConfig,
  filenameCasing,
  forbidContentPattern,
} from './src/index.js'

export default defineConfig({
  rules: [
    filenameCasing({
      style: 'kebab-case',
      paths: ['**/src/**', '**/test/**'],
    }),
    forbidContentPattern({
      match: /\p{Extended_Pictographic}/u,
      reason: 'No emojis in documentation',
      paths: ['**/*.md'],
    }),
  ],
})
