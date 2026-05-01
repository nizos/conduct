import { defineConfig, forbidContentPattern } from '../../../src/index.js'

export default defineConfig({
  rules: [
    {
      files: ['**/src/**', '**/test/**'],
      rules: [
        forbidContentPattern({
          match: /./,
          reason: 'matcher engaged',
        }),
      ],
    },
  ],
})
