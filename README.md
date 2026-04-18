# Conduct

Process discipline for coding agents.

## Overview

Conduct evaluates actions your coding agent attempts against configurable rules. Each rule returns allow, block, or modify, along with a reason the agent can act on. Rules hook into the agent's native extension points, starting with Claude Code.

## Status

Pre-code. First shipped feature coming soon.

## Background

[tdd-guard](https://github.com/nizos/tdd-guard) is a Claude Code hook by the same author that enforces test-driven development. Conduct generalizes that approach so it can express rules beyond TDD.

## License

[MIT](LICENSE)
