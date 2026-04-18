# Conduct

[![CI](https://github.com/nizos/conduct/actions/workflows/ci.yml/badge.svg)](https://github.com/nizos/conduct/actions/workflows/ci.yml)
[![Security](https://github.com/nizos/conduct/actions/workflows/security.yml/badge.svg)](https://github.com/nizos/conduct/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Process discipline for coding agents.

## Overview

Conduct evaluates actions your coding agent attempts against configurable rules. Each rule returns allow, block, or modify, along with a reason the agent can act on. Rules are agent-agnostic; a thin adapter plugs into each agent's native extension points.

## Status

Early development. API subject to change.

## Background

[tdd-guard](https://github.com/nizos/tdd-guard) enforces test-driven development as a Claude Code hook. Conduct generalizes that approach beyond TDD and across coding agents.

## License

[MIT](LICENSE)
