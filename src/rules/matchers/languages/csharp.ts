import { isRegistered } from './register.js'

export const csharp = {
  name: 'csharp',
  parser: isRegistered('csharp') ? 'csharp' : undefined,
  patterns: [
    { rule: { kind: 'method_declaration', regex: '\\[Fact\\]' } },
    { rule: { kind: 'method_declaration', regex: '\\[Theory\\]' } },
    { rule: { kind: 'method_declaration', regex: '\\[Test\\]' } },
    { rule: { kind: 'method_declaration', regex: '\\[TestMethod\\]' } },
  ],
} as const
