import { defineConfig, forbidContentPattern } from '../../../src/index.js'

export default defineConfig({
  rules: [
    {
      files: ['!src/foo.ts'],
      rules: [forbidContentPattern({ match: /./, reason: 'should not fire' })],
    },
  ],
})
