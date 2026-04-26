# Conduct

[![npm version](https://badge.fury.io/js/@nizos%2Fconduct.svg)](https://www.npmjs.com/package/@nizos/conduct)
[![npm downloads](https://img.shields.io/npm/dt/@nizos/conduct)](https://www.npmjs.com/package/@nizos/conduct)
[![CI](https://github.com/nizos/conduct/actions/workflows/ci.yml/badge.svg)](https://github.com/nizos/conduct/actions/workflows/ci.yml)
[![Security](https://github.com/nizos/conduct/actions/workflows/security.yml/badge.svg)](https://github.com/nizos/conduct/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Process discipline for coding agents.

## Overview

Conduct is a policy engine that sits between coding agents and your codebase, evaluating each attempted action against configurable rules. It generalizes [tdd-guard](https://github.com/nizos/tdd-guard) beyond TDD and across coding agents.

## Features

- **Multi-Agent Support** - Works with Claude Code, OpenAI Codex, and GitHub Copilot
- **TDD Enforcement** - Blocks code without a failing test, works with any test runner
- **Customizable Validation** - Adjust TDD rules to match your team's style
- **Pattern Rules** - Block command or content patterns by string or regex
- **Deterministic + AI** - Fast text rules; AI judgment only where it matters
- **Extensible** - Drop in your own rules

## Status

Early development. API subject to change.

## Getting started

- **[Setup guide](docs/setup.md)** - Connect conduct to your agent
- **[Rules reference](docs/rules.md)** - Built-in rules and their options

Create `conduct.config.ts` at your project root. Example:

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

## License

[MIT](LICENSE)
