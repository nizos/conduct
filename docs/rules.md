# Rules

Probity ships five built-in rules. Each is a factory called with its options in `probity.config.ts`.

## enforceTdd

Blocks a write unless the session's recent history shows a failing test that the pending implementation would address, and the write is the minimum needed to make that test pass. Uses an AI validator — via the agent's official SDK — to judge the pending action against the transcript and the file's current content.

- **Applies to:** write actions
- **Supported agents:** Claude Code, OpenAI Codex, GitHub Copilot

### Options

| Option            | Type                                       | Default                      | Description                                                                                                                                                                                      |
| ----------------- | ------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `instructions`    | `string \| ((defaults: string) => string)` | built-in three-rule TDD spec | Overrides or extends the default TDD rules text. Pass a string to replace outright, or a function `(defaults) => ...` to extend (e.g. append a project addendum without forking the whole spec). |
| `maxEvents`       | `number`                                   | `20`                         | Keep at most this many of the most recent session events when building the validator prompt. Caps token usage on long transcripts.                                                               |
| `maxContentChars` | `number`                                   | `4000`                       | Truncate any single event's text/output longer than this with a head + marker + tail replacement, so the validator still sees both edges.                                                        |

### Examples

```ts
enforceTdd()

// Replace the default rules outright:
enforceTdd({
  instructions: `Rules:
1. Tests must use the project's custom assertion helpers.
2. ...`,
})

// Extend the defaults with a project-specific addendum:
enforceTdd({
  instructions: (defaults) => `${defaults}

### Project rule

Tests must use the project's custom assertion helpers.`,
})

// To scope to specific paths, wrap in a `{ files, rules }` block:
{
  files: ['**/src/**'],
  rules: [enforceTdd()],
}
```

### Cost note

Every matching write triggers an AI call. Scope with a `{ files, rules }` block so the rule fires only on the code you care about.

---

## enforceFilenameCasing

Blocks a write whose filename doesn't match the configured casing style. Passes non-write actions through.

- **Applies to:** write actions
- **Supported agents:** Claude Code, OpenAI Codex, GitHub Copilot

### Options

| Option  | Type                                          | Default  | Description                           |
| ------- | --------------------------------------------- | -------- | ------------------------------------- |
| `style` | `'kebab-case' \| 'camelCase' \| 'snake_case'` | required | Casing style the filename must match. |

### Examples

```ts
enforceFilenameCasing({ style: 'kebab-case' })

// To scope to specific paths, wrap in a `{ files, rules }` block:
{
  files: ['**/src/**', '**/test/**'],
  rules: [enforceFilenameCasing({ style: 'kebab-case' })],
}
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

| Option   | Type               | Default  | Description                                              |
| -------- | ------------------ | -------- | -------------------------------------------------------- |
| `match`  | `string \| RegExp` | required | Pattern to match against the file content being written. |
| `reason` | `string`           | required | Surfaced back to the agent when the rule blocks.         |

### Examples

```ts
forbidContentPattern({
  match: 'setTimeout',
  reason: 'No timers in source code',
})

// To scope to specific paths, wrap in a `{ files, rules }` block:
{
  files: ['**/*.md'],
  rules: [
    forbidContentPattern({
      match: /\p{Extended_Pictographic}/u,
      reason: 'No emojis in documentation',
    }),
  ],
}
```

---

## requireCommand

Gates a command action on a prior command appearing in canonical session history. By default the required command must be the most recent event; the optional `after` filter relaxes this by naming the events that invalidate the required command if they appear after it.

- **Applies to:** command actions (bash / shell tool calls)
- **Supported agents:** Claude Code, OpenAI Codex, GitHub Copilot

### Options

| Option    | Type                                                                 | Default        | Description                                                                                                                                                                                                                                                                                   |
| --------- | -------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `before`  | `{ kind: 'command'; match: string \| RegExp }`                       | required       | Which actions this rule gates. Only commands whose text matches `before.match` are evaluated; everything else passes through.                                                                                                                                                                 |
| `command` | `string \| RegExp`                                                   | required       | The prior command pattern that must satisfy the gate. Matched against canonical command events in session history.                                                                                                                                                                            |
| `after`   | `{ kind: 'write' } \| { kind: 'command'; match?: string \| RegExp }` | any event      | What invalidates the required command if it appears after the most recent matching command. Without `after`, any event after the required command invalidates it (the required command must be the most recent event). With `{ kind: 'command' }`, omit `match` to invalidate on any command. |
| `reason`  | `string`                                                             | auto-generated | Surfaced when the rule blocks. Defaults to a message naming the required pattern.                                                                                                                                                                                                             |

### Examples

```ts
// Block commits unless `npm run lint` was the most recent event.
requireCommand({
  before: { kind: 'command', match: /git commit/ },
  command: /npm run lint/,
})

// Allow non-write events between lint and commit; a write since lint
// invalidates the gate.
requireCommand({
  before: { kind: 'command', match: /git commit/ },
  command: /npm run lint/,
  after: { kind: 'write' },
  reason: 'Run lint after every change before committing.',
})

// Only `git add` invalidates; other commands between lint and commit
// are fine.
requireCommand({
  before: { kind: 'command', match: /git commit/ },
  command: /npm run lint/,
  after: { kind: 'command', match: /git add/ },
})
```
