import { createRequire } from 'node:module'

import {
  registerDynamicLanguage,
  type DynamicLangRegistrations,
} from '@ast-grep/napi'

const require = createRequire(import.meta.url)

type LangRegistration = DynamicLangRegistrations[string]

function tryRegisterPython(): string | undefined {
  try {
    const lang = require('@ast-grep/lang-python') as
      | LangRegistration
      | { default: LangRegistration }
    const handle = 'default' in lang ? lang.default : lang
    registerDynamicLanguage({ python: handle })
    return 'python'
  } catch {
    return undefined
  }
}

export const python = {
  name: 'python',
  parser: tryRegisterPython(),
  patterns: [{ rule: { kind: 'function_definition', regex: '^def test_' } }],
} as const
