# Setup

Wire conduct into your agent's hook system. Each vendor's section below shows the hook config to add.

## Claude Code

### Recommended: install via plugin

Two commands wire conduct into Claude Code's hook system, no manual config edit:

```
/plugin marketplace add nizos/conduct
/plugin install conduct@conduct
```

The plugin ships the `PreToolUse` hook with the matcher `Bash|Write|Edit`, which covers commands and file modifications.

### Manual install

If you'd rather wire the hook yourself, add a `PreToolUse` entry to `.claude/settings.json` (project) or `~/.claude/settings.json` (user-global):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx @nizos/conduct@latest --agent claude-code"
          }
        ]
      }
    ]
  }
}
```

The matcher controls which tools fire the hook. `Bash|Write|Edit` covers commands and file modifications.

Further reading: [Claude Code's hooks documentation](https://code.claude.com/docs/en/hooks).

## OpenAI Codex

Codex hooks are gated behind a feature flag. Enable it in `~/.codex/config.toml`:

```toml
[features]
codex_hooks = true
```

Then add a `PreToolUse` hook in `~/.codex/hooks.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "^(Bash|apply_patch|Edit|Write)$",
        "hooks": [
          {
            "type": "command",
            "command": "npx @nizos/conduct@latest --agent codex"
          }
        ]
      }
    ]
  }
}
```

Codex's matcher is a regex. `^(Bash|apply_patch|Edit|Write)$` covers shell commands and file modifications (Codex sends file writes as `apply_patch`; `Edit`/`Write` are matcher synonyms documented by Codex).

Further reading: [Codex's hooks documentation](https://developers.openai.com/codex/hooks).

## GitHub Copilot

GitHub Copilot loads hooks from the `.github/hooks/` directory in your project root — the same path the cloud agent reads from your repo's default branch. Create `.github/hooks/conduct.json`:

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      {
        "type": "command",
        "bash": "npx @nizos/conduct@latest --agent github-copilot"
      }
    ]
  }
}
```

Every tool call fires the hook; conduct's rules pass through non-write actions. Conduct accepts Copilot's `bash`, `create`, and `edit` tool payloads.

Further reading: [GitHub Copilot's hooks reference](https://docs.github.com/en/copilot/reference/hooks-configuration).

## CLI

The `conduct` bin is what each vendor's hook command invokes. You can also run it directly — for testing rule changes, scripting CI checks, or pointing at a config that lives outside the repo.

```bash
npx @nizos/conduct@latest --agent <vendor> < hook-payload.json
```

The bin reads a hook payload from stdin (capped at 10 MiB) and writes the vendor's response JSON to stdout.

### Options

- `--agent <vendor>` — Required. One of `claude-code`, `codex`, or `github-copilot`.
- `--config <path>` — Load rules from `<path>` instead of auto-discovering `conduct.config.ts`. Use for gitignored configs, CI overrides, or A/B comparisons.
- `--version` — Print the package version.
- `--help` — Print usage and exit.
