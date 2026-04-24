#!/usr/bin/env node
import { readFileSync } from 'node:fs'

import { adapters, isAgent } from './adapters/registry.js'
import { run } from './cli.js'

const agentIndex = process.argv.indexOf('--agent')
const agentArg = process.argv[agentIndex + 1]
if (!isAgent(agentArg)) {
  const known = Object.keys(adapters).join(', ')
  const got = agentArg === undefined ? '(missing)' : agentArg
  process.stderr.write(
    `conduct: --agent ${got} is not a known agent. Expected one of: ${known}\n`,
  )
  process.exit(2)
}

const payload = readFileSync(0, 'utf8')
const response = await run(payload, { agent: agentArg })
process.stdout.write(response)
