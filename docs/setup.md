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

## GitHub Copilot

Configure Copilot's hook system to invoke:

```
npx @nizos/conduct@latest --agent github-copilot
```

Refer to GitHub Copilot's hooks documentation for the precise config file and matcher syntax. Conduct accepts Copilot's `bash`, `create`, and `edit` tool payloads.

## CLI

```bash
npx @nizos/conduct@latest --agent <vendor>   # claude-code | codex | github-copilot
npx @nizos/conduct@latest --version
npx @nizos/conduct@latest --help
```

`conduct` reads the hook payload from stdin (capped at 10 MiB) and writes the vendor's response JSON to stdout.
