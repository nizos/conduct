# Conduct

[![npm version](https://badge.fury.io/js/@nizos%2Fconduct.svg)](https://www.npmjs.com/package/@nizos/conduct)
[![npm downloads](https://img.shields.io/npm/dt/@nizos/conduct)](https://www.npmjs.com/package/@nizos/conduct)
[![CI](https://github.com/nizos/conduct/actions/workflows/ci.yml/badge.svg)](https://github.com/nizos/conduct/actions/workflows/ci.yml)
[![Security](https://github.com/nizos/conduct/actions/workflows/security.yml/badge.svg)](https://github.com/nizos/conduct/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Process discipline for coding agents.

## Overview

Conduct is a policy engine that sits between coding agents and your codebase, evaluating each attempted action against configurable rules. It generalizes [tdd-guard](https://github.com/nizos/tdd-guard) beyond TDD and across coding agents.

<p align="center">
  <a href="https://nizar.se/uploads/videos/conduct-demo.mp4">
    <img src="docs/assets/conduct-demo-screenshot.gif" alt="Conduct demo showing TDD enforcement" width="600">
  </a>
  <br>
  <em>Click to watch Conduct enforce TDD</em>
</p>

## Features

- **Multi-Agent Support** - Works with Claude Code, OpenAI Codex, and GitHub Copilot
- **TDD Enforcement** - Blocks code without a failing test, works with any test runner
- **Customizable Validation** - Adjust TDD rules to match your team's style
- **Pattern Rules** - Block command or content patterns by string or regex
- **Deterministic + AI** - Fast text rules; AI judgment only where it matters
- **Extensible** - Drop in your own rules

## Getting started

[Install and wire Conduct into your agent](docs/setup.md) and then create a `conduct.config.ts` config file at the root of your project. See the [rules reference](docs/rules.md) for all built-in rules and their options.

### Example Configuration

```ts
import {
  defineConfig,
  enforceTdd,
  enforceFilenameCasing,
  forbidCommandPattern,
  forbidContentPattern,
} from '@nizos/conduct'

export default defineConfig({
  rules: [
    forbidCommandPattern({
      match: 'npm install',
      reason: 'Use pnpm install instead',
    }),
    {
      files: ['src/**', 'test/**'],
      rules: [
        enforceTdd(),
        enforceFilenameCasing({ style: 'kebab-case' }),
        forbidContentPattern({
          match: 'setTimeout',
          reason: 'No timers in source code',
        }),
        forbidContentPattern({
          match: 'eslint-disable',
          reason: 'Fix the lint violation rather than disabling the rule',
        }),
      ],
    },
    {
      files: ['**/*.md'],
      rules: [
        forbidContentPattern({
          match: /\p{Extended_Pictographic}/u,
          reason: 'No emojis in documentation',
        }),
      ],
    },
  ],
})
```

## Contributing

Contributions are welcome! See the [contributing guidelines](CONTRIBUTING.md) to get started.

## License

[MIT](LICENSE)
