import {
  defineConfig,
  enforceTdd,
  enforceFilenameCasing,
  forbidContentPattern,
} from './src/index.js'

export default defineConfig({
  rules: [
    {
      files: ['**/src/**', '**/test/**'],
      rules: [enforceTdd(), enforceFilenameCasing({ style: 'kebab-case' })],
    },
    {
      files: ['**/*.md'],
      rules: [
        forbidContentPattern({
          match: /\p{Extended_Pictographic}/u,
          reason: 'No emojis in documentation',
        }),
      ],
    },
  ],
})
