---
type: Ad-hoc Record
---

# Ad-hoc Work Record: 2026-07-06-liminalabs-polish

> **Type**: quick-task
> **Created**: 2026-07-06
> **Branch**: feat/init-agent-prompt
> **Backlog**: none
> **Status**: in-progress

## Current Behavior

Post-namespace-move follow-ups (operator-directed, same session as
`2026-07-06-repo-transfer-liminalabs`):

1. No positive Limina Labs attribution anywhere — site footer said
   "© 2026 momentum", README had no byline, the GitHub repo description was
   empty, and one docs example used `--owner avinash`.
2. `momentum init` silently defaulted to the claude-code adapter. momentum
   has been multi-adapter since v0.20.x — a hidden default scaffolds the
   wrong surface for opencode/codex/antigravity users.

## Expected Behavior

1. **Branding**: README byline ("Built and maintained by Limina Labs"),
   site footer "© 2026 Limina Labs", about-page "Maintained by" line, docs
   example owner neutralized, GitHub repo description + homepage set.
2. **init agent selection (v0.31.0)**: no default agent. Interactive shells
   get a numbered picker (number or agent name, re-asks on invalid input,
   EOF-safe). Non-interactive callers get a hard error listing available
   agents — nothing is written. `--agent <name>` bypasses the prompt
   exactly as before. Adapter list comes from `listAvailableAgents()` so
   future adapters appear automatically.

**Rule 14 note**: removing the init default changes CLI behavior (public
interface). Shipped as a quick-task on explicit operator direction ("no
default installation for claude code — it should ask"); bounded to the init
dispatch path + docs + tests.

## Unchanged Behavior

- `--agent <name>` continues to work identically (63 existing test call
  sites unchanged).
- `upgrade` / `ecosystem` dispatch keep their existing agent semantics —
  only `init` loses the default (the internal claude-code fallback remains
  for those paths).
- Installed file trees are byte-identical per adapter — no fingerprint
  fixture drift (fingerprint tests pass `--agent` explicitly).
- Legacy init tests (49 call sites) exercise FILE behavior, not agent
  selection; `tests/_helpers.js::runCli` re-injects `--agent claude-code`
  for them (bypassable via `rawArgs: true`), with selection behavior owned
  by `tests/init-agent-prompt.test.js`.

## Verification Evidence

Fresh from this session (2026-07-06):

**New behavior tests** (`node --test tests/init-agent-prompt.test.js`):

```
✔ non-interactive init without --agent fails fast and writes nothing
✔ picker: numeric answer installs the numbered agent
✔ picker: agent name answer works; invalid answers re-ask
✔ picker: stdin EOF without an answer exits non-zero, writes nothing
✔ explicit --agent still bypasses the prompt entirely
ℹ pass 5  fail 0
```

**Full suite** (`npm test`):

```
ℹ tests 833
ℹ pass 833
ℹ fail 0
```

**Help text smoke** (`node bin/momentum.js --help`):

```
  --agent <name>                      Agent to install for. `init` asks when this
                                      is omitted (and requires it without a TTY)
                                      Available: antigravity, claude-code, codex, opencode
```

**GitHub metadata** (`gh repo view LiminaLabsAI/momentum`): description +
homepage set and verified in the same session.
