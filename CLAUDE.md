# Conduct

Process discipline for coding agents. A vendor-agnostic policy engine that sits between the agent and the codebase, evaluating each attempted action against configurable rules and blocking, modifying, or allowing it, and providing correction and guidance.

## Discipline

- Strict TDD — failing test first, minimum impl to pass, no speculation.
- Atomic conventional commits — test and implementation together.

## Layout

- `src/types.ts` — canonical types (Action, Decision, Agent, Verdict, SessionEvent)
- `src/rules/` — built-in rules + `contract.ts` (Rule type); `rules/utils/` holds shared rule helpers
- `src/utils/` — cross-cutting helpers (json-string, read-jsonl, read-capped, parse-args)
- `src/vendors/<vendor>/{adapter,agent,transcript}.ts` — per-vendor pieces
- `src/vendors/{adapter,to-verdict}.ts` — adapter contract and AI verdict parser
- `src/registry.ts` — vendor entries (adapter + agent + transcript per vendor)
- `src/{cli,bin,config,engine,index}.ts` — application wiring
- `test/fixtures/` — captured hook payloads and transcript fixtures
- `test/integration/` — integration tests (gated on `CONDUCT_INTEGRATION_AI=1`)
