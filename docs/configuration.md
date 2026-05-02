# Configuration

Conduct loads its config from a `conduct.config` file in your project. The file declares the active rules and, optionally, overrides the AI validator.

## File location

Conduct looks for a `conduct.config` file at your project root, walking up from the current directory. Supported extensions are `.ts`, `.mts`, `.js`, and `.mjs`. If none is found, conduct fails closed and the action is blocked.

```ts
// conduct.config.ts
import { defineConfig, enforceTdd } from '@nizos/conduct'

export default defineConfig({
  rules: [
    {
      files: ['src/**', 'test/**'],
      rules: [enforceTdd()],
    },
  ],
})
```

Globs inside a `files` array are anchored against the config file's directory, so `'src/**'` matches files under `<config-dir>/src/` regardless of where the agent's session is rooted. Two patterns are kept as-authored:

- `**`-prefixed globs (`'**/*.ts'`) are intentional "match anywhere" patterns and skip anchoring.
- Negations (`!src/legacy/**`) anchor the path inside the `!`; the leading `!` is preserved.

See [Rules](rules.md) for the built-in catalog.

## The `ai` override

Conduct's default AI validator pairs with the agent selected by `--agent` (e.g. the Claude Agent SDK for `claude-code`) and piggybacks on the user's logged-in session. To use a different model or provider, set `ai` on the config; the value must implement `{ reason: (prompt: string) => Promise<Verdict> }`.

The host coding agent itself is selected by the `--agent` CLI flag, not by the config — that keeps the same config portable across vendors.

## Overriding the file location

Pass `--config` to point conduct at a specific file instead of using walk-up resolution:

```
conduct --agent claude-code --config ./tooling/conduct.config.ts < payload.json
```

The path is resolved against the current working directory.

## Custom rules

A rule is a function from action and context to result. Listed flat in `rules`, it runs against every action (writes and commands) and self-filters; wrapped in a `{ files, rules }` block, the `files` glob narrows writes by path.

```ts
// conduct.config.ts
import { defineConfig, type Rule } from '@nizos/conduct'

const noTodoComments: Rule = (action) => {
  if (action.kind !== 'write') return { kind: 'pass' }
  if (!action.content.includes('TODO')) return { kind: 'pass' }
  return {
    kind: 'violation',
    reason: 'Open a tracking issue instead of leaving a TODO.',
  }
}

export default defineConfig({
  rules: [noTodoComments],
})
```

Action shapes:

- `{ kind: 'write'; path: string; content: string }` — `path` is absolute POSIX.
- `{ kind: 'command'; command: string }` — shell command text.

Return shapes:

- `{ kind: 'pass' }` to allow the action.
- `{ kind: 'violation'; reason: string }` to block. The reason is surfaced back to the agent.

The optional second argument carries the engine's context:

- `ctx.agent?.reason(prompt)` — the AI validator the engine wired up (the `ai` override or the vendor's default). Use this for LLM-judged rules. Returns `Promise<Verdict>`.
- `ctx.history?()` — an async function returning the recent session as a list of `SessionEvent`s. May be undefined when the vendor adapter doesn't supply transcript access. Call it on demand, since reading the transcript can be slow.

Rules can be sync or async; the engine awaits the result either way.
