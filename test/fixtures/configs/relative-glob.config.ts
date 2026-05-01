import { defineConfig, forbidContentPattern } from '../../../src/index.js'

// Uses non-anchored relative globs (no `**/` prefix) to exercise the
// adapter-side cwd relativization. Pre-fix this would silently no-op
// against absolute paths in vendor payloads. The rule itself fires on
// any non-empty content, so a deny is the unambiguous "the matcher
// engaged" signal.
export default defineConfig({
  rules: [
    {
      files: ['src/**', 'test/**'],
      rules: [
        forbidContentPattern({
          match: /./,
          reason: 'relative-glob matcher engaged',
        }),
      ],
    },
  ],
})
