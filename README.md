# Conduct

[![CI](https://github.com/nizos/conduct/actions/workflows/ci.yml/badge.svg)](https://github.com/nizos/conduct/actions/workflows/ci.yml)
[![Security](https://github.com/nizos/conduct/actions/workflows/security.yml/badge.svg)](https://github.com/nizos/conduct/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Process discipline for coding agents.

## Overview

Conduct evaluates actions your coding agent attempts against configurable rules. Each rule returns allow, block, or modify, along with a reason the agent can act on. Rules hook into the agent's native extension points, starting with Claude Code.

## Status

Early development. API subject to change.

## Background

[tdd-guard](https://github.com/nizos/tdd-guard) enforces test-driven development as a Claude Code hook. Conduct generalizes that approach so it can express rules beyond TDD.

## License

[MIT](LICENSE)
