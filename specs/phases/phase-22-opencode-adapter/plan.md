# Phase 22 — Reach: opencode Adapter — Implementation Plan

> **Execution order:**
> `Group 0 → (Groups 1 + 2 + 3 in parallel) → Group 4 → Group 5`
>
> Lane: `phase-22-opencode-adapter`. Known overlap advisories with lane
> `feat-open-knowledge-format` on `bin/momentum.js`, `specs/planning/roadmap.md`,
> and `tests/` — whichever lands second rebases (Rule 6 Landing Order).

## Group 0 — Adapter skeleton + contracts

**Sequential.** Blocks everything.
**External dependency:** `npm i -g opencode-ai` (live probe; capture `opencode --version`).

- [ ] `adapters/opencode/adapter.js`:
  - `displayName: 'opencode'`
  - `destinations`: `commands → ['.opencode','commands']`, `agent-rules → ['.agent','rules']`,
    `scripts → ['scripts']`, `engines → ['.agent','engines']`, `skills → ['.opencode','skills']`,
    `agents → ['.opencode','agents']`, `workflows` declared-unused (no native surface)
  - `primaryInstruction`: `instructions/AGENTS.md → AGENTS.md`, marker-aware
  - `configFiles`: momentum plugin → `.opencode/plugins/momentum.js`
  - full `capabilities` block (uniform booleans) + `roadmap` notes
    (`parallelSubagents`/`sessionStartHook`/`skills` pending G5 live evidence;
    serve/attach + custom-tools as forward notes)
- [ ] `adapters/opencode/instructions/{header.md,vars.json,surfaces.md}`;
  wire adapter into `scripts/generate-instructions.js`; generate `AGENTS.md`; drift-guard green
- [ ] Live probe evidence: `evidence/g0-opencode-version.txt`

**Verification:** `npm test` (drift-guard, capability audit); tmp-dir `init --agent opencode` smoke.
**Commit:** `feat(opencode): adapter skeleton + generated AGENTS.md (G0)`

## Group 1 — Native command recipes + skills

**Parallel with Groups 2 and 3.**

- [ ] Transform the ~20 core recipes into `.opencode/commands/*.md`
  (frontmatter `description`; `$ARGUMENTS` mapping; drop platform-specific frontmatter)
- [ ] Ship momentum skill set natively to `.opencode/skills/<name>/SKILL.md`
  (name-regex compliant: `^[a-z0-9]+(-[a-z0-9]+)*$`)
- [ ] Shape tests: every command has description frontmatter; every skill validates

**Verification:** new `tests/adapter-opencode-commands.test.js` green; suite green.
**Commit:** `feat(opencode): native command recipes + skills (G1)`

## Group 2 — Enforcement plugin

**Parallel with Groups 1 and 3.**

- [ ] `.opencode/plugins/momentum.js`:
  - `tool.execute.before`: brainstorm gate — throw on write-class tools
    (`write`/`edit`/`patch`) targeting `specs/**` while `.momentum/brainstorm-active` exists
  - `tool.execute.after`: history reminder (same semantics as `check-history-reminder.sh`)
  - `session.created`: pending-handoff banner (reads `.momentum/inbox/`)
- [ ] Plugin logic unit-testable in plain node (no Bun/opencode required for CI)

**Verification:** `tests/adapter-opencode-plugin.test.js` green.
**Commit:** `feat(opencode): momentum enforcement plugin (G2)`

## Group 3 — Agents + spawn contract

**Parallel with Groups 1 and 2.**

- [ ] Reviewer subagents at `.opencode/agents/`: `momentum-reviewer-architecture.md`,
  `momentum-reviewer-qa.md`, `momentum-reviewer-security.md` —
  `mode: subagent`, `permission: { edit: deny }` (true read-only)
- [ ] `swarm-supervisor.md` agent
- [ ] `adapter.spawn(directive)` → `opencode run --dir <repoPath> --agent swarm-supervisor "<directive>"`

**Verification:** spawn contract test + agent shape tests green.
**Commit:** `feat(opencode): reviewer + swarm-supervisor agents, spawn contract (G3)`

## Group 4 — Install/upgrade wiring + regression suite

**Sequential.** Integrates G0–G3.

- [ ] `runInstall` / `runUpgrade` (managed-file records; `already exists` warnings per Codex pattern)
- [ ] opencode install fingerprint snapshot test
- [ ] Existing-adapter fingerprints byte-identical (claude-code / codex / antigravity)
- [ ] `package.json` `files` globs cover `adapters/opencode/**`; tarball-shape test updated
- [ ] Capability-audit test row; synthetic swarm e2e fixture (opencode column)
- [ ] `momentum upgrade` idempotence test on an opencode fixture

**Verification:** full suite green from 733-test baseline; `npm pack --dry-run` shape check.
**Commit:** `feat(opencode): install/upgrade wiring + regression suite (G4)`

## Group 5 — Live validation + docs + release prep

**Sequential.** Last.
**External dependency:** installed `opencode` CLI with a configured provider.

- [ ] Live checks (evidence → `evidence/`, `--format json` where possible):
  1. `/command` discovery in TUI
  2. plugin gate blocks a `specs/` write while `brainstorm-active` exists
  3. history reminder fires post-edit
  4. `session.created` handoff banner
  5. reviewer subagent invocation (`@momentum-reviewer-qa` or Task tool)
  6. `opencode run --dir <repo> --agent swarm-supervisor` spawn
  7. multi-adapter skills coexistence (`.agents/skills/` + `.opencode/skills/` — no dupe weirdness)
- [ ] Finalize `parallelSubagents` / `sessionStartHook` / `skills` booleans from evidence
- [ ] `core/adapter-capabilities.md` + `core/adapter-parity-matrix.md` opencode columns
- [ ] README + site adapter mention
- [ ] Roadmap repair: add shipped Phase 23 Rules Unification row; Reach = opencode @ v0.27.0;
  Intelligence → v0.28.0; Cursor/Gemini noted as later Reach wave
- [ ] Retrospective with `## Verification Evidence`; version bump 0.26.0 → 0.27.0
- [ ] Release: `lanes done` → `lanes land` (operator approval gates per Rule 6; then
  project release checklist: gh release + npm publish, both operator-approved)

**Verification:** all 7 evidence files present; full suite green; docs build clean.
**Commit:** `docs(opencode): live validation evidence + docs + v0.27.0 prep (G5)`
