import type { SessionEvent } from '../../types.js'

/**
 * Copilot Chat stores its transcript at the path VS Code passes via
 * `transcript_path`, but the JSONL format differs from what we
 * currently parse for the Copilot CLI / Claude Code. Returning an
 * empty array means rules that ask for history get a clean slate
 * until the format is reverse-engineered.
 */
export async function readTranscript(_path: string): Promise<SessionEvent[]> {
  return []
}
