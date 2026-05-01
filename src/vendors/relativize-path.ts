import path from 'node:path'

/**
 * Project-relative form of `p`, anchored at `cwd` (or `process.cwd()`
 * when cwd is missing, matching the config loader). Lets rule path
 * matchers (`files`, `paths`) be written as `'src/**'` regardless of
 * how the agent reports the path.
 *
 * Paths that resolve outside cwd come back as `../...`, so a `'src/**'`
 * matcher naturally won't match them.
 */
export function relativizePath(cwd: string | undefined, p: string): string {
  const base = cwd && cwd.length > 0 ? cwd : process.cwd()
  return path.relative(base, path.resolve(base, p)) || '.'
}
