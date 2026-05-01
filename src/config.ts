import { existsSync } from 'node:fs'
import path from 'node:path'

import { createJiti } from 'jiti'

import type { Agent } from './types.js'
import type { Rule } from './rules/contract.js'

/**
 * A scoped rule block. Groups rules under a shared `files` filter so
 * the same path glob doesn't have to be repeated on each rule.
 * Mirrors the ESLint flat-config shape.
 *
 * - `files` omitted — block applies to every action (same as a flat rule).
 * - `files: []` — explicit "match nothing"; the block is skipped.
 * - `files: [...]` — write actions are filtered by the glob; non-write
 *   actions (commands) pass the block-level filter and rules inside
 *   self-filter by action type.
 */
export type RuleBlock = {
  files?: readonly string[]
  rules: readonly Rule[]
}

/**
 * What a `Config.rules` entry can be: either a flat rule (applies
 * everywhere) or a `RuleBlock` (applies under a `files` filter).
 */
export type RuleEntry = Rule | RuleBlock

/**
 * A project's Conduct configuration.
 *
 * - `rules` — the active rules for the session. Entries can be flat
 *   rules or `{ files, rules }` blocks; blocks scope their rules to
 *   write actions whose path matches `files`.
 * - `agent` — optional AI validator to inject into every rule's ctx.
 *   When omitted, the engine uses the validator that pairs with the
 *   selected vendor (e.g. Claude Agent SDK for `claude-code`), which
 *   piggybacks on the user's logged-in session.
 */
export type Config = {
  rules: readonly RuleEntry[]
  agent?: Agent
}

/**
 * Typed identity helper for `conduct.config.ts`. Wrap your exported
 * config in this so editors provide autocomplete and type-check the
 * rule list. Has no runtime behavior — it exists solely so the default
 * export is inferred as `Config` without the user typing it.
 *
 * @example
 * import { defineConfig, enforceFilenameCasing } from '@nizos/conduct'
 *
 * export default defineConfig({
 *   rules: [enforceFilenameCasing({ style: 'kebab-case' })],
 * })
 */
export function defineConfig(config: Config): Config {
  return config
}

const CONFIG_FILENAME = 'conduct.config.ts'

/**
 * Load a Conduct config file (TypeScript or JavaScript) from an absolute
 * path. Returns the default export. Backed by jiti so `.ts` configs run
 * without a build step. Block-level `files` globs are anchored against
 * the config's directory so they match `Action.path` (absolute POSIX)
 * regardless of where the agent's session is rooted.
 */
export async function loadConfig(filepath: string): Promise<Config> {
  const jiti = createJiti(import.meta.url)
  const module = await jiti.import<{ default: Config }>(filepath)
  const root = path.dirname(filepath)
  return {
    ...module.default,
    rules: module.default.rules.map((entry) => {
      if (typeof entry === 'function' || !entry.files) return entry
      return {
        ...entry,
        files: entry.files.map((glob) => anchorGlob(glob, root)),
      }
    }),
  }
}

// `**`-prefixed globs are intentional "match anywhere" patterns; anchoring
// them at the config dir would defeat the user's intent. Negations carry
// the same convention through the `!` prefix.
function anchorGlob(glob: string, root: string): string {
  if (glob.startsWith('!')) return '!' + anchorGlob(glob.slice(1), root)
  if (glob.startsWith('**')) return glob
  return path.posix.join(root, glob)
}

export function findConfig(startDir: string): string {
  let dir = startDir
  while (true) {
    const candidate = path.join(dir, CONFIG_FILENAME)
    if (existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) {
      throw new Error(
        `${CONFIG_FILENAME} not found (searched from ${startDir} up to /)`,
      )
    }
    dir = parent
  }
}
