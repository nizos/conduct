import { constants } from 'node:fs'
import { open, type FileHandle } from 'node:fs/promises'

export const DEFAULT_MAX_BYTES = 100 * 1024 * 1024

/**
 * Read a bounded JSONL file and return one parsed entry per non-empty
 * line. Lines that fail to JSON.parse are silently dropped (best-effort
 * recovery from partial writes). Refuses symlinks and files larger than
 * `maxBytes` (default 100 MiB) — both are guards against transcript
 * paths that could point at unintended large or sensitive files.
 */
export async function readJsonl(
  path: string,
  options: { maxBytes?: number } = {},
): Promise<unknown[]> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  const handle = await openNoFollow(path)
  try {
    const info = await handle.stat()
    if (info.size > maxBytes) {
      throw new Error(
        `file at ${path} exceeds ${maxBytes} bytes (got ${info.size})`,
      )
    }
    const raw = await handle.readFile('utf8')
    const entries: unknown[] = []
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue
      try {
        entries.push(JSON.parse(line))
      } catch {
        // Skip malformed lines.
      }
    }
    return entries
  } finally {
    await handle.close()
  }
}

async function openNoFollow(path: string): Promise<FileHandle> {
  try {
    return await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ELOOP') {
      throw new Error(`file at ${path} is a symbolic link (refusing)`)
    }
    throw err
  }
}
