# momentum — Ecosystem

> Coordination layer for the momentum family of repos.
> Created by `momentum ecosystem init`.

## What lives here

| Path | Purpose |
|---|---|
| `ecosystem.json` | Manifest: members, roles, dependency edges. |
| `initiatives/` | Cross-repo feature files (`NNNN-slug.md`). |
| `sessions/` | Daily activity log (`YYYY-MM-DD.md`), auto-appended by member-repo hooks. |
| `.state/` | Runtime state (gitignored). |

## Quick commands

```
momentum ecosystem status                    # show members + git state
momentum ecosystem add ../<repo>             # register a member
momentum ecosystem remove <id>               # unregister a member
```

## Members

Run `momentum ecosystem status` to see the current registered members.

## Conventions

- The ecosystem layer is strictly additive. It never writes into a
  member's `specs/`. The only touch on a member repo is one fenced
  line in its `CLAUDE.md` / `AGENTS.md` pointing back here.
- Add members via `momentum ecosystem add`. Don't hand-edit
  `ecosystem.json` unless you know what you're doing — validation runs
  on every CLI write.
