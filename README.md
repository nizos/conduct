# Conduct

[![CI](https://github.com/nizos/conduct/actions/workflows/ci.yml/badge.svg)](https://github.com/nizos/conduct/actions/workflows/ci.yml)
[![Security](https://github.com/nizos/conduct/actions/workflows/security.yml/badge.svg)](https://github.com/nizos/conduct/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Process discipline for coding agents.

## Overview

Conduct evaluates actions your coding agent attempts against configurable rules. Each rule returns allow or block along with a reason the agent can act on. Rules are agent-agnostic; a thin adapter plugs into each agent's native extension points.

## Supported agents

- Claude Code
- OpenAI Codex
- GitHub Copilot

## Status

Early development. API subject to change.

## Example config

Rules live in `conduct.config.ts` at your project root:

```ts
import {
  defineConfig,
  enforceTdd,
  filenameCasing,
  forbidCommandPattern,
  forbidContentPattern,
} from '@nizos/conduct'

export default defineConfig({
  rules: [
    enforceTdd({ paths: ['src/**', '!src/**/*.test.ts'] }),
    filenameCasing({ style: 'kebab-case' }),
    forbidCommandPattern({
      match: 'npm install',
      reason: 'Use pnpm install instead',
    }),
    forbidContentPattern({
      match: 'setTimeout',
      reason: 'Avoid timers in production code',
      paths: ['src/**', '!src/**/*.test.ts'],
    }),
    forbidContentPattern({
      match: 'eslint-disable',
      reason: 'Fix the lint violation rather than disabling the rule',
    }),
  ],
})
```

Each rule is a factory called with its options. The engine evaluates them in order against every action the agent attempts; the first violation blocks the action and surfaces `reason` back to the agent.

## CLI

Conduct ships a CLI that reads a hook payload from stdin and writes the vendor's response format to stdout. Configure your agent's `PreToolUse` hook to invoke `conduct --agent <vendor>` with the vendor matching your runtime.

```bash
conduct --agent claude-code     # or: codex, github-copilot
conduct --version
conduct --help
```

## Background

[tdd-guard](https://github.com/nizos/tdd-guard) enforces test-driven development as a Claude Code hook. Conduct generalizes that approach beyond TDD and across coding agents.

## License

[MIT](LICENSE)
