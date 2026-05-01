import { defineConfig, forbidContentPattern } from '../../../src/index.js'

export default defineConfig({
  rules: [
    {
      files: ['!**/foo.test.ts'],
      rules: [forbidContentPattern({ match: /./, reason: 'should not fire' })],
    },
  ],
})
