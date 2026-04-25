# Conduct

[![npm version](https://badge.fury.io/js/@nizos%2Fconduct.svg)](https://www.npmjs.com/package/@nizos/conduct)
[![CI](https://github.com/nizos/conduct/actions/workflows/ci.yml/badge.svg)](https://github.com/nizos/conduct/actions/workflows/ci.yml)
[![Security](https://github.com/nizos/conduct/actions/workflows/security.yml/badge.svg)](https://github.com/nizos/conduct/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Process discipline for coding agents.

## Overview

Conduct is a vendor-agnostic policy engine that sits between the agent and the codebase, evaluating each attempted action against configurable rules and blocking, modifying, or allowing it, and providing correction and guidance. It generalizes [tdd-guard](https://github.com/nizos/tdd-guard) beyond TDD and across coding agents.

## Features

- **Vendor-agnostic** — one config across Claude Code, OpenAI Codex, and GitHub Copilot.
- **Deterministic + AI** — text and regex rules for fast guardrails; AI judgment only where it matters.
- **TDD out of the box** — `enforceTdd` ships ready: no test reporter, no state files.
- **Extensible** — drop in your own rules; the engine just runs them.
- **Reuses your agent's session** — AI-validated rules go through the agent's official SDK.

## Status

Early development. API subject to change.

## Getting started

Define your rules in `conduct.config.ts` at your project root:

```ts
import {
  defineConfig,
  enforceTdd,
  forbidCommandPattern,
  forbidContentPattern,
} from '@nizos/conduct'

export default defineConfig({
  rules: [
    enforceTdd({ paths: ['**/*.ts'] }),
    forbidCommandPattern({
      match: 'npm install',
      reason: 'Use pnpm install instead',
    }),
    forbidContentPattern({
      match: 'setTimeout',
      reason: 'No timers in source code',
      paths: ['src/**'],
    }),
    forbidContentPattern({
      match: 'eslint-disable',
      reason: 'Fix the lint violation rather than disabling the rule',
    }),
    forbidContentPattern({
      match: /\p{Extended_Pictographic}/u,
      reason: 'No emojis in documentation',
      paths: ['**/*.md'],
    }),
  ],
})
```

See the [rules reference](docs/rules.md) for each rule's options and the [setup guide](docs/setup.md) for how to wire conduct into your agent.

## License

[MIT](LICENSE)
