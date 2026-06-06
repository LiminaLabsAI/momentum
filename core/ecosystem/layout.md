# Ecosystem Root: On-Disk Layout

> A momentum **ecosystem** is a sibling git repo that coordinates a set
> of related momentum-installed repos as one product. Reading this
> file tells you everything about what lives where.

## Layout

```
<ecosystem-root>/
├── ecosystem.json        ← manifest (members, roles, dep edges)
├── README.md             ← human-readable description + worked example
├── initiatives/          ← cross-repo feature files
│   ├── README.md
│   ├── 0001-<slug>.md
│   └── 0002-<slug>.md
├── sessions/             ← daily activity logs
│   ├── .gitkeep
│   ├── 2026-06-07.md
│   └── 2026-06-08.md
├── .state/               ← runtime state (gitignored)
│   ├── active-initiative ← contents = slug or empty
│   └── last-session      ← contents = ISO date
└── .gitignore            ← `.state/` plus standard noise
```

## File contracts

### `ecosystem.json`
Single source of truth for the ecosystem's membership and inter-repo
edges. Schema: `core/ecosystem/schema/ecosystem.schema.json`. Validated
on read.

### `initiatives/NNNN-<slug>.md`
Cross-repo feature record. Top YAML frontmatter block conforms to
`core/ecosystem/schema/initiative.schema.json`. Body is markdown
sections from the initiative template
(`core/ecosystem/templates/initiative-template.md`):
- **Why** — one paragraph
- **Per-repo contributions** — per-member bullets
- **Linked decisions** — ADR pointers (cross-repo OK)
- **Deploy chronology** — timestamps, repos, SHAs
- **Close** — populated by `momentum ecosystem initiative close`

Numbering is monotonically increasing across the ecosystem. The
filename slug is for human readability; the `id` integer is canonical.

### `sessions/YYYY-MM-DD.md`
One file per UTC date. Appended to atomically by the PostToolUse hook
in each member repo. Header line (first write of the day) names the
active initiative if any. Subsequent lines have the format:

```
HH:MMZ [<member-id>] <event-summary> (<context>)
```

Examples:
```
03:24Z [sapience] commit 8a086117 — fix(memory): caller-accessible fanout
04:30Z [sapience] deploy success — image_tag=8a086117
09:50Z [sapience] PR #42 merged — list[T] query binding fix
```

### `.state/active-initiative`
A single line, either empty or containing the slug of the currently
active initiative. Set by `momentum ecosystem initiative create`;
cleared by `… close`. The session-log hook reads this to inject the
"Active initiative: …" header line.

### `.state/last-session`
The ISO date of the most recent session file. Cheap cache so the hook
doesn't re-stat every directory entry.

## Conventions

- The ecosystem root is **discovered** by walking up from `$PWD` (max 5
  parents) until a directory containing `ecosystem.json` is found.
  The resolution is memoized per session.
- The ecosystem layer **never writes** into a member repo's `specs/`.
  It only writes to its own directories above. The single touch on a
  member is one fenced line in its `CLAUDE.md` / `AGENTS.md`:
  ```html
  <!-- ecosystem:begin -->
  > Member of `<name>` ecosystem at `../<name>`. See ecosystem.json.
  <!-- ecosystem:end -->
  ```
- The ecosystem root is a normal git repo. `momentum ecosystem init`
  runs `git init` and produces the initial commit; subsequent changes
  are user-managed (the ecosystem doesn't enforce a workflow on itself
  beyond the schema check).

## What lives where

| Question | File |
|----------|------|
| What repos are in this ecosystem? | `ecosystem.json` |
| What are we shipping right now? | `.state/active-initiative` + `initiatives/<slug>.md` |
| What happened today? | `sessions/<today>.md` |
| What's the cross-repo dependency graph? | `ecosystem.json` `dependencies` |
| Where does a member repo's per-repo planning live? | Inside that member's own `specs/` (unchanged) |
