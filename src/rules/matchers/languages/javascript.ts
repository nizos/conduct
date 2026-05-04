import { Lang } from '@ast-grep/napi'

export const javascript = {
  name: 'javascript',
  extensions: ['.js'],
  parser: Lang.JavaScript,
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
