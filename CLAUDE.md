# Conduct

Process discipline for coding agents. A vendor-agnostic policy engine that sits between the agent and the codebase, evaluating each attempted action against configurable rules and blocking, modifying, or allowing it, and providing correction and guidance.

## Discipline

- Strict TDD — failing test first, minimum impl to pass, no speculation.
- Atomic conventional commits — test and implementation together.

## Layout

Grows organically as tests drive new modules into existence; the shape below is the vision.

- `src/rules/` — rules
- `src/adapters/` — agent adapters (per-vendor hook payload translation)
- `src/providers/` — AI providers (pluggable back-ends for rules that reason)
- `src/engine.ts` — engine
- `src/config.ts` — config
- `src/cli.ts` — CLI
- `src/bin.ts` — CLI shell entry
- `src/rule.ts` — canonical rule and action types
- `src/index.ts` — public barrel
- `test/fixtures/` — captured hook payloads and example inputs
- `test/integration/` — integration tests
