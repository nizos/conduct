import {
  defineConfig,
  enforceTdd,
  filenameCasing,
  forbidContentPattern,
} from './src/index.js'

export default defineConfig({
  rules: [
    enforceTdd({ paths: ['**/src/**', '**/test/**'] }),
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
