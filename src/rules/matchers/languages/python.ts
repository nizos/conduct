import { registerDynamicLanguage } from '@ast-grep/napi'
import langPython from '@ast-grep/lang-python'

registerDynamicLanguage({ python: langPython })

export const python = {
  name: 'python',
  parser: 'python',
  patterns: [{ rule: { kind: 'function_definition', regex: '^def test_' } }],
} as const
