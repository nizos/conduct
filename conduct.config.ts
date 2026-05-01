import { defineConfig, enforceTdd, forbidContentPattern } from './src/index.js'

export default defineConfig({
  rules: [
    {
      files: ['**/src/**', '**/test/**'],
      rules: [
        enforceTdd({
          maxEvents: 20,
          maxContentChars: 5000,
        }),
      ],
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
