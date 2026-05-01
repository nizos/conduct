import { defineConfig, enforceTdd, forbidContentPattern } from './src/index.js'

export default defineConfig({
  rules: [
    {
      files: ['src/**', 'test/**'],
      rules: [
        enforceTdd({
          maxEvents: 30,
          maxContentChars: 8000,
        }),
        forbidContentPattern({
          match: 'eslint-disable',
          reason: 'Fix the lint violation rather than disabling the rule',
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
