import { existsSync } from 'node:fs'
import path from 'node:path'

import { createJiti } from 'jiti'

import type { Agent, Rule } from './rule.js'

/**
 * A project's Conduct configuration.
 *
 * - `rules` — the active rules for the session, each produced by
 *   calling a rule factory with its options.
 * - `agent` — optional AI validator to inject into every rule's ctx.
 *   When omitted, the engine uses the validator that pairs with the
 *   selected vendor (e.g. Claude Agent SDK for `claude-code`), which
 *   piggybacks on the user's logged-in session.
 */
export type Config = {
  rules: readonly Rule[]
  agent?: Agent
}

/**
 * Typed identity helper for `conduct.config.ts`. Wrap your exported
 * config in this so editors provide autocomplete and type-check the
 * rule list. Has no runtime behavior — it exists solely so the default
 * export is inferred as `Config` without the user typing it.
 *
 * @example
 * import { defineConfig, filenameCasing } from '@nizos/conduct'
 *
 * export default defineConfig({
 *   rules: [filenameCasing({ style: 'kebab-case' })],
 * })
 */
export function defineConfig(config: Config): Config {
  return config
}

const CONFIG_FILENAME = 'conduct.config.ts'

/**
 * Load a Conduct config file (TypeScript or JavaScript) from an absolute
 * path. Returns the default export. Backed by jiti so `.ts` configs run
 * without a build step.
 */
export async function loadConfig(filepath: string): Promise<Config> {
  const jiti = createJiti(import.meta.url)
  const module = (await jiti.import(filepath)) as { default: Config }
  return module.default
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
