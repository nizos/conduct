import picomatch from 'picomatch'

import type { Action } from '../../types.js'

export function buildMatcher(patterns: string[]): (path: string) => boolean {
  if (patterns.length === 0) return () => false
  const includes = patterns.filter((p) => !p.startsWith('!'))
  const ignore = patterns
    .filter((p) => p.startsWith('!'))
    .map((p) => p.slice(1))
  const matcher = picomatch(includes.length ? includes : '**', { ignore })
  return (path) => matcher(path)
}

export function actionMatchesFilesScope(
  files: readonly string[],
  action: Action,
): boolean {
  if (files.length === 0) return false
  if (action.kind !== 'write') return true
  return buildMatcher([...files])(action.path)
}
