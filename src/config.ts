import { createJiti } from 'jiti'

import type { Rule } from './rule'

/**
 * A project's Conduct configuration — the rules active for the session.
 * Each entry is a `Rule` produced by `configure(ruleDefinition, options)`.
 */
export type Config = {
  rules: Rule[]
}

/**
 * Typed identity helper for `conduct.config.ts`. Wrap your exported
 * config in this so editors provide autocomplete and type-check the
 * rule list.
 *
 * @example
 * import { configure, defineConfig } from '@nizos/conduct'
 * import { filenameCasing } from '@nizos/conduct/rules/filename-casing'
 *
 * export default defineConfig({
 *   rules: [configure(filenameCasing, { style: 'kebab-case' })],
 * })
 */
export function defineConfig(config: Config): Config {
  return config
}

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
