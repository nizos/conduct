import { Lang } from '@ast-grep/napi'

export const typescript = {
  name: 'typescript',
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
