---
id: 0
slug: replace-me
title: Replace me
status: in-progress
started: 1970-01-01
owner: replace-me
repos: []
---

# Initiative {{ID}} — {{TITLE}}

> Cross-repo feature spanning {{REPOS}}.
> Started {{STARTED}} by {{OWNER}}.

## Why

One short paragraph that captures the motivation for this initiative.
What problem are we solving? Why does it span multiple repos? What
becomes possible once it ships?

## Per-repo contributions

For each member repo touched, list the contributing branches, PRs,
and phases. Update as work lands.

- **{{REPO_1}}**: …
- **{{REPO_2}}**: …

## Linked decisions

ADRs, scope changes, or decisions taken in any member repo's
`specs/decisions/` or `specs/phases/<phase>/history.md` that this
initiative implements or depends on. Cross-repo links allowed.

- …

## Deploy chronology

When the initiative ships in stages across repos, log the order here.
Timestamps in UTC. Format:
`YYYY-MM-DD HH:MMZ — <member> <sha> — <one-line summary>`

- …

## Close

Populated by `momentum ecosystem initiative close <slug>`. Captures:
what shipped, what was deferred, what was learned. Mirrors the role of
a phase retrospective at the cross-repo level.
