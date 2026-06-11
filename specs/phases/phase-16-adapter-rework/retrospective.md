# Phase 16 Rework — Codex & Antigravity Native-Idiom Adapters: Retrospective

## What shipped

A complete native-idiom rebuild of the Codex and Antigravity adapters,
replacing the force-ported `phase-16-adapter-parity` attempt. Claude Code
zero-regression preserved via an explicit install-fingerprint snapshot
test that runs on every group commit.

### The conceptual unlock

Phase 16 Rework distinguishes three categories that the previous attempt
conflated into one "slash command" surface:

| Category | What it is | Mental model |
|---|---|---|
| **Recipe** | Step-by-step instructions agent FOLLOWS | "Follow this procedure" |
| **Persona / Skill** | Identity / capability agent LOADS to BECOME | "BE a security reviewer" |
| **Parallel worker / Subagent** | Spawned sibling that works concurrently | "Go do this in parallel" |

Phase commands like `/brainstorm-phase` are recipes. Reviewers like
`momentum-reviewer-security` are personas. They surface differently per
platform and should be shipped differently.

### Per-platform native idiom

| Concept | Claude Code | Antigravity | Codex |
|---|---|---|---|
| Recipe | `.claude/commands/<name>.md` → `/<name>` | `.agent/workflows/<name>.md` → `/<name>` | AGENTS.md "Recipes Lookup Pattern" — recipes at `.codex/commands/<name>.md`, user invokes by name, agent finds + follows |
| Persona / Skill | (inline in CLAUDE.md) | `.agents/skills/<name>/SKILL.md` directory | `.agents/skills/<name>/SKILL.md` directory (shared convention) |
| Parallel worker | Task tool | Native parallel subagent | `.codex/agents/<name>.toml` (TOML schema; sandbox_mode = read-only) |
| Hook matcher | `Write\|Edit\|MultiEdit` | `run_command\|view_file\|.*write.*\|apply_patch` | `apply_patch\|shell` |

### What landed per adapter

**Codex** (Group 1):
- `.codex/hooks.json` with `apply_patch|shell` matcher (PreToolUse, PostToolUse, SessionStart)
- 3 TOML reviewer subagents at `.codex/agents/` with `sandbox_mode = "read-only"`
- `.agents/skills/momentum-orient/SKILL.md` (genuine persona)
- AGENTS.md rewritten with "Momentum Recipes — Lookup Pattern" section + 20-row recipe table mapping each recipe to `.codex/commands/<name>.md`
- AGENTS.md documents `features.hooks = true` opt-in for users on `~/.codex/config.toml`

**Antigravity** (Group 2):
- 5 overlay workflows at `.agent/workflows/{scout,dispatch,handoff,continue,review-code}.md` with YAML frontmatter (description) + numbered steps
- 15 core commands ship as workflows via destinations.commands → `.agent/workflows/` rewire
- 4 skills at `.agents/skills/momentum-{orient,reviewer-security,reviewer-qa,reviewer-architecture}/SKILL.md` (directories with SKILL.md + frontmatter)
- `.agents/hooks.json` with `run_command|view_file|.*write.*|apply_patch` (PreToolUse), `run_command|apply_patch|.*write.*` (PostToolUse), unmatched SessionStart
- AGENTS.md rewritten with `.agent/` + `.agents/` layout table, workflows section, skills section, hooks event table, SessionStart fallback hint
- Capability flips: `slashCommands false → true`, `skills false → true`

**Shared** (Group 0 + Group 3):
- `core/scripts/brainstorm-gate.sh` (promoted from adapters/claude-code/scripts/) generalized to parse Claude `tool_input.file_path`, Antigravity `tool_input.path`, Codex `apply_patch` `tool_input.input` with `*** Update File:` extraction, Codex `shell` `tool_input.command` with specs/-grep
- Project-root resolution: `MOMENTUM_PROJECT_DIR` → `CLAUDE_PROJECT_DIR` → `pwd`
- Adapter contract `destinations` extended with `workflows` + `skills` + `agents` keys (uniform across adapters; declared-not-used pattern where applicable)
- `core/adapter-parity-matrix.md` introduced as per-feature × per-adapter shipping status grid with footnote-explained statuses
- `core/adapter-capabilities.md` refreshed
- `bin/momentum.js init()` copies entire `core/scripts/` recursively (fixes v0.18.0 latent bug where sessionstart-handoff.sh was referenced in settings.json but never installed)

### Claude Code zero-regression guard

The headline guarantee: every v0.18.0 Claude Code behavior intact.
Enforcement:

- `tests/claude-code-regression.test.js` snapshots a SHA256 fingerprint
  of every installed file (45 files at v0.19.0 baseline). Runs on every
  group commit. Catches silent content drift the pass-count gate can't see.
- `tests/brainstorm-gate.test.js` 10 Claude scenarios preserved byte-equivalent
  through the script generalization.
- No file under `adapters/claude-code/` modified except the one allowed
  exception: the `core/scripts/brainstorm-gate.sh` source-tree promotion
  (post-install path unchanged at `scripts/brainstorm-gate.sh`).

## Verification Evidence

Captured in `evidence/`:

- `evidence/test-suite.txt` — `npm test` → **326/326 PASS** (288 v0.18.0 baseline → +38 new tests across the phase)
- `evidence/codex-install.txt` — `momentum init --agent codex` file tree, `.codex/hooks.json` content, 3 TOMLs + orient skill, AGENTS.md recipe table verification (115 lines)
- `evidence/antigravity-install.txt` — `momentum init --agent antigravity` file tree, `.agents/hooks.json` content, 19 core-command workflows shipping as `.agent/workflows/*.md`, 5 overlay workflows, 4 skill directories (143 lines)

### Deferred (live-runtime validation → VAL-001 / VAL-002)

`codex` and `agy` CLIs unavailable in the rework dev env. Live-runtime
verification deferred to P1 backlog items with explicit 6-question
checklists each.

- **VAL-001** — Codex live dogfood. Confirms: `features.hooks` opt-in effect, `apply_patch` matcher coverage, `.codex/agents/` TOML discovery, parallel fan-out, `.agents/skills/` discovery, AGENTS.md recipe-lookup-pattern adoption.
- **VAL-002** — Antigravity live dogfood. Confirms: `.agent/workflows/` (singular) vs `.agents/workflows/` (plural) path lock, workflow → `/<name>` auto-registration, skill discovery, PreToolUse + PostToolUse fire, SessionStart event surfacing.

Capability flips gated on VAL evidence stay `false` for v0.19.0:
Codex `parallelSubagents`, Codex `skills`, Antigravity `sessionStartHook`.
Matrix cells documented as gated.

## Acceptance check

| # | Criterion | Status |
|---|---|---|
| 1 | Every D1–D9 test passes locally | YES — 326/326 suite + dedicated test files for each deliverable |
| 2 | `npm test` ≥288 on every group commit | YES — passed continuously through G0 (295), G1 (307), G2 (320), G3 (326), G4 (326) |
| 3 | No `adapters/claude-code/` file modified except the one allowed promotion | YES — `git log --stat adapters/claude-code/` shows only the brainstorm-gate.sh move |
| 4 | Parity matrix declares status for every (feature, adapter) cell | YES — `tests/adapter-parity-matrix.test.js` enforces |
| 5 | retrospective.md contains Rule 12 Verification Evidence | YES — see "Verification Evidence" section above |
| 6 | Antigravity `.agent/` vs `.agents/` path resolved or VAL-002 explicit | VAL-002 filed with explicit path-lock question; ship-time pick is `.agent/` (singular) per canonical docs page |
| 7 | ENH-023 / ENH-024 footnotes resolved | YES — refreshed against post-research vendor docs in `core/adapter-capabilities.md` |

## What surprised us

- **The recipe vs skill distinction is load-bearing.** Conflating them
  (the previous attempt's `.codex/skills/momentum-brainstorm-phase/SKILL.md`
  approach) wasn't just stylistically wrong — it misframes the agent's
  job (BECOME the persona vs FOLLOW the procedure). The right framing
  unlocked the per-platform mapping.
- **Antigravity workflows ARE slash commands.** The previous attempt
  declared `slashCommands: false` for Antigravity based on
  "chat-driven UI" framing. Actually, workflow filename → `/<name>`
  is the native registration pattern.
- **Codex AGENTS.md size is binding.** 32 KiB limit means 19 recipes ×
  ~100 lines each don't fit inline. The recipes-lookup-pattern (AGENTS.md
  teaches the lookup, recipes stay at `.codex/commands/`) is the
  pragmatic answer. Conceptually impure — recipes referenced by AGENTS.md
  rather than embedded — but practical.
- **The Claude Code regression test caught a v0.18.0 latent bug.**
  sessionstart-handoff.sh was referenced in settings.json but never
  installed. The recursive `core/scripts/` copy (added for shared
  brainstorm-gate.sh) silently fixed it. The fingerprint test surfaced
  the change as content drift; we accepted it as an intentional fix.
- **The previous attempt was right about destinations.** The destinations
  contract extension (`workflows` + `skills` + `agents` keys) was the
  right move; only the values per-adapter changed.

## What we'd do differently

- **Research first, build right.** The first Phase 16 attempt
  (`phase-16-adapter-parity` branch) consumed effort building on
  documentation belief, not verified native idioms. A 7-agent research
  workflow before any code changes would have surfaced the
  workflows-vs-skills distinction up front.
- **Live-CLI dev env should be a prerequisite for adapter phases.**
  VAL-001 + VAL-002 should ideally close in-phase, not as post-release
  follow-ups. For Phase 17 onward, recommend the dev env has all
  supported agent CLIs installed before phase start.

## Followups

- **VAL-001** (Codex live-runtime dogfood; gates `parallelSubagents` + `skills` flips)
- **VAL-002** (Antigravity live-runtime dogfood; gates `sessionStartHook` flip; locks `.agent/` vs `.agents/` workflow path)
- **`phase-16-adapter-parity` branch retention** — keep as research record on origin; rename to `phase-16-research-record` post-merge to make the relationship explicit
- **ENH-009 (distribution decision)** — now unblocked since Codex + Antigravity both ship at parity; tackle in Phase 17 alongside Cursor + Gemini
- **ENH-019 (auto-publish on tag)** — still open; would smooth v0.19.0 release
- **ENH-030 (`/complete-phase` `gh release create` step)** — still open; project-specific release checklist covers it

## Release readiness

- Branch: `phase-16-adapter-rework`
- Target tag: `v0.19.0`
- Release artifacts: `@avinash-singh-io/momentum@0.19.0` on npm + GitHub Release `v0.19.0`
- Pre-flight checklist:
  - [x] All test gates passing (326/326)
  - [x] Tarball-shape test includes all new files (Codex agents/skills + Antigravity workflows/skills/hooks.json)
  - [x] `package.json` `files` glob covers `workflows/**` + `skills/**` + `agents/**`
  - [x] Claude Code regression test passes against the v0.19.0 baseline
  - [ ] Bump `package.json` version `0.18.0` → `0.19.0` (release step)
  - [ ] Tag `v0.19.0` (release step, after merge)
  - [ ] `gh release create v0.19.0 ... --latest --verify-tag` (release step)
  - [ ] `npm publish --access public` (release step)
  - [ ] Verify both surfaces live (`gh release list`, `npm view`)

Per the autonomous-execution contract + the project-specific release
checklist + the user direction "Only the commit and release, you will
wait for my approval," the engine STOPS here. The merge + tag + GitHub
Release + npm publish steps require explicit user approval.
