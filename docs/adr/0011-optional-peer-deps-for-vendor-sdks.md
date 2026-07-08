# ADR-0011: Make vendor SDKs optional peer-deps, fail loud when missing

- **Status:** Accepted
- **Date:** 2026-07-08
- **Source commits:** e061eff, 9a70156, 657b0f3

## Context

The three vendor SDKs (`@anthropic-ai/claude-agent-sdk`, `@github/copilot-sdk`,
`@openai/codex-sdk`) were declared as regular `dependencies`. Each ships
platform binaries, so installing Probity pulled all three regardless of which
agent a user actually drives — roughly 2GB for a single-vendor setup
(nizos/probity#45).

The source was already fully decoupled from this install-time cost: every
value-level SDK use is a lazy `await import('<sdk>')` inside a private loader
(`loadDefaultQueryFn` / `loadDefaultCodex` / `resolveClient`), reached only
when the selected vendor reasons. All static SDK imports are `import type`,
erased at build (`verbatimModuleSyntax: true`), and no SDK type leaks into the
public `exports` surface. The 2GB was purely a packaging artifact, not a
load-bearing one.

ADR-0006 already solved the equivalent problem for the ast-grep language
packs: optional peer-deps, with a fail-soft runtime that degrades silently to
the AI fast-path when a pack is absent. Vendor SDKs cannot reuse the
"silent degradation" half of that pattern — a missing SDK means the selected
agent literally cannot reason at all, unlike a missing language pack, which
only forfeits a cheap deterministic optimization.

## Decision

Move the three SDKs from `dependencies` to `peerDependencies` (`*` range) with
`peerDependenciesMeta.optional: true`, mirroring the ast-grep lang-pack
entries. Keep them pinned in `devDependencies` too, so Probity's own build,
dogfood (`@nizos/probity` self-dep), and integration tests keep exercising the
real SDKs — the dual listing is intentional, not redundant: `devDependencies`
serves the maintainer, `peerDependencies` serves the consumer, and `npm
install` always fetches `devDependencies` regardless of the peer-dep
mechanism.

Add a shared `src/vendors/load-sdk.ts` helper that wraps `await
import(specifier)`:

- On success, returns the module.
- On a genuine missing-module error for _this_ specifier — Node's
  `ERR_MODULE_NOT_FOUND` **and** a message that names `specifier` — throws a
  new error naming the package and the install command
  (`npm install -D <specifier>`).
- On any other error, including a _transitive_ `ERR_MODULE_NOT_FOUND` raised
  from inside an SDK that IS installed (its message names some other module,
  not `specifier`), re-throws untouched. Without this cross-check, a user with
  a broken-but-present SDK would be told to "install" a package they already
  have.

Each vendor's loader (`claude-code/agent.ts`, `codex/agent.ts`,
`github-copilot/agent.ts`) delegates to this helper instead of calling
`import()` directly. `toVerdict` already catches any thrown loader error and
surfaces `error.message` verbatim as the violation reason, so the friendly
message reaches the user for free — no change needed there. The helper keys
off the package specifier rather than the vendor name, so the hidden
`github-copilot-chat` vendor (which reuses the `githubCopilot` agent) gets
correct guidance automatically.

## Consequences

A user installing Probity for one agent now downloads only that agent's SDK.
An agent run without its SDK installed fails loudly with an actionable
message instead of an unhandled `ERR_MODULE_NOT_FOUND` stack trace. This
changes the default install contract — a user who previously got all three
SDKs "for free" must now install the one they use — so it is a semver-major
change in spirit; the exact version bump is left to the maintainer at release
time. The `devDependencies`/`peerDependencies` duplication
must be maintained deliberately: deleting the devDep would silently drop
coverage from the build and the real-SDK integration test.

## Considered alternatives

**Reuse ADR-0006's silent-degradation pattern verbatim (swallow the missing
module and no-op).** Rejected: a missing vendor SDK is a hard precondition,
not an optimization — the selected agent cannot produce a verdict at all, so
silently doing nothing would hide a broken setup instead of surfacing it.

**`optionalDependencies` instead of optional peer-deps.** Rejected:
`optionalDependencies` are still auto-installed by npm/pnpm/yarn/bun by
default, so it would not reduce the install footprint at all.

**Leave SDKs as regular `dependencies` and just document the footprint.**
Rejected: this was the status quo the issue was filed against; it does
nothing to fix the reported problem.
