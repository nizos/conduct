import { Lang } from '@ast-grep/napi'

export const typescript = {
  name: 'typescript',
  extensions: ['.ts', '.tsx'],
  parser: Lang.TypeScript,
  patterns: [
    'it($$$ARGS)',
    'test($$$ARGS)',
    'it.skip($$$ARGS)',
    'it.only($$$ARGS)',
    'test.skip($$$ARGS)',
    'test.only($$$ARGS)',
    'test.each($$$ARGS)',
    'it.each($$$ARGS)',
  ],
} as const
