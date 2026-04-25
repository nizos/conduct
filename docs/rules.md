# Rules

Conduct ships four built-in rules. Each is a factory called with its options in `conduct.config.ts`.

## enforceTdd

Blocks a write unless the session's recent history shows a failing test that the pending implementation would address, and the write is the minimum needed to make that test pass. Uses an AI validator — via the agent's official SDK — to judge the pending action against the transcript and the file's current content.

- **Applies to:** write actions
- **Supported agents:** Claude Code, OpenAI Codex, GitHub Copilot

### Options

| Option            | Type       | Default                      | Description                                                                                                                               |
| ----------------- | ---------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `instructions`    | `string`   | built-in three-rule TDD spec | Overrides the default TDD rules text. The generic process instructions (what inputs the validator sees and how to read them) stay.        |
| `paths`           | `string[]` | match all                    | Gitignore-style globs scoping which writes are checked. Leading `!` negates.                                                              |
| `maxEvents`       | `number`   | `10`                         | Keep at most this many of the most recent session events when building the validator prompt. Caps token usage on long transcripts.        |
| `maxContentChars` | `number`   | `1000`                       | Truncate any single event's text/output longer than this with a head + marker + tail replacement, so the validator still sees both edges. |

### Examples

```ts
enforceTdd()
enforceTdd({ paths: ['**/*.ts'] })
enforceTdd({
  paths: ['src/**'],
  instructions: `Rules:
1. Tests must use the project's custom assertion helpers.
2. ...`,
})
```

### Cost note

Every matching write triggers an AI call — the most expensive rule in the library. Scope with `paths` so the rule fires only on the code you care about.

---

## filenameCasing

Blocks a write whose filename doesn't match the configured casing style. Passes non-write actions through.

- **Applies to:** write actions
- **Supported agents:** Claude Code, OpenAI Codex, GitHub Copilot

### Options

| Option  | Type                                          | Default   | Description                                                                  |
| ------- | --------------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| `style` | `'kebab-case' \| 'camelCase' \| 'snake_case'` | required  | Casing style the filename must match.                                        |
| `paths` | `string[]`                                    | match all | Gitignore-style globs scoping which writes are checked. Leading `!` negates. |

### Examples

```ts
filenameCasing({ style: 'kebab-case' })
filenameCasing({ style: 'kebab-case', paths: ['src/**', 'test/**'] })
```

---

## forbidCommandPattern

Blocks a command whose text matches `match` — a literal substring or a `RegExp`. Passes non-command actions and non-matching commands through.

- **Applies to:** command actions (bash / shell tool calls)
- **Supported agents:** Claude Code, OpenAI Codex, GitHub Copilot

### Options

| Option   | Type               | Default  | Description                                                          |
| -------- | ------------------ | -------- | -------------------------------------------------------------------- |
| `match`  | `string \| RegExp` | required | Pattern to match against the command text.                           |
| `reason` | `string`           | required | Surfaced back to the agent when the rule blocks. Make it actionable. |

### Examples

```ts
forbidCommandPattern({
  match: 'npm install',
  reason: 'Use pnpm install instead',
})

forbidCommandPattern({
  match: /rm\s+-rf/,
  reason: 'Avoid destructive rm',
})
```

---

## forbidContentPattern

Blocks a write whose content matches `match` — a literal substring or a `RegExp`. Passes non-write actions through.

- **Applies to:** write actions
- **Supported agents:** Claude Code, OpenAI Codex, GitHub Copilot

### Options

| Option   | Type               | Default   | Description                                                                  |
| -------- | ------------------ | --------- | ---------------------------------------------------------------------------- |
| `match`  | `string \| RegExp` | required  | Pattern to match against the file content being written.                     |
| `reason` | `string`           | required  | Surfaced back to the agent when the rule blocks.                             |
| `paths`  | `string[]`         | match all | Gitignore-style globs scoping which writes are checked. Leading `!` negates. |

### Examples

```ts
forbidContentPattern({
  match: 'setTimeout',
  reason: 'No timers in source code',
  paths: ['src/**'],
})

forbidContentPattern({
  match: /\p{Extended_Pictographic}/u,
  reason: 'No emojis in documentation',
  paths: ['**/*.md'],
})
```
