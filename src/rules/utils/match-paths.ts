import picomatch from 'picomatch'

export function buildMatcher(patterns: string[]): (path: string) => boolean {
  const includes = patterns.filter((p) => !p.startsWith('!'))
  const ignore = patterns
    .filter((p) => p.startsWith('!'))
    .map((p) => p.slice(1))
  const matcher = picomatch(includes.length ? includes : '**', { ignore })
  return (path) => matcher(path)
}
