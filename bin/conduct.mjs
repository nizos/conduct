#!/usr/bin/env node
import { readFileSync } from 'node:fs'

import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url)
const { run } = await jiti.import(
  new URL('../src/cli.ts', import.meta.url).href,
)

const agentIndex = process.argv.indexOf('--agent')
const agent = process.argv[agentIndex + 1]

const payload = readFileSync(0, 'utf8')
const response = await run(payload, { agent })
process.stdout.write(response)
