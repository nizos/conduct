import path from 'node:path'

/**
 * Project-relative POSIX form of `p`, anchored at `cwd` (or
 * `process.cwd()` when cwd is missing, matching the config loader).
 * Lets rule path matchers (`files`, `paths`) be written as `'src/**'`
 * regardless of how the agent reports the path or which OS Node runs
 * on.
 *
 * Paths that resolve outside cwd come back as `../...`. Output always
 * uses `/` separators because picomatch is POSIX-only.
 */
export function relativizePath(cwd: string | undefined, p: string): string {
  const base = cwd && cwd.length > 0 ? cwd : process.cwd()
  const rel = path.relative(base, path.resolve(base, p)) || '.'
  return rel.split(path.sep).join('/')
}
