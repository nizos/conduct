#!/usr/bin/env node
import { readFileSync } from 'node:fs'

import { run, type Agent } from './cli.js'

const agentIndex = process.argv.indexOf('--agent')
const agent = process.argv[agentIndex + 1] as Agent

const payload = readFileSync(0, 'utf8')
const response = await run(payload, { agent })
process.stdout.write(response)
