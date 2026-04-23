import { createJiti } from 'jiti'

import type { Rule } from './rule'

export type Config = {
  rules: Rule[]
}

export function defineConfig(config: Config): Config {
  return config
}

export async function loadConfig(filepath: string): Promise<Config> {
  const jiti = createJiti(import.meta.url)
  const module = (await jiti.import(filepath)) as { default: Config }
  return module.default
}
