import path from 'node:path'

/**
 * Project-relative POSIX form of `p`, anchored at `cwd`. Lets rule
 * path matchers (`files`, `paths`) be written as `'src/**'`
 * regardless of how the agent reports the path or which OS Node
 * runs on.
 *
 * Paths that resolve outside cwd come back as `../...`. Output always
 * uses `/` separators because picomatch is POSIX-only.
 */
export function relativizePath(cwd: string, p: string): string {
  const rel = path.relative(cwd, path.resolve(cwd, p)) || '.'
  return rel.split(path.sep).join('/')
}
