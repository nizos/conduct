import { Lang } from '@ast-grep/napi'

export const typescript = {
  name: 'typescript',
  parser: Lang.TypeScript,
  patterns: ['it($$$ARGS)'],
} as const
