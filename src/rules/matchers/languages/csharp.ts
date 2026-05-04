import { isRegistered } from './register.js'

export const csharp = {
  name: 'csharp',
  parser: isRegistered('csharp') ? 'csharp' : undefined,
  patterns: [
    {
      rule: {
        kind: 'method_declaration',
        regex: '\\[(Fact|Theory|Test|TestMethod)\\]',
      },
    },
  ],
} as const
