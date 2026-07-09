---
type: Plan
---

# Phase 28 — Plan

```
# Sequential: G0 → G1 → G2 → G3 → G4
# (G1 and G2 are independent mechanism fixes — parallelizable as lanes if desired)
```

G0 defines the contract (ADR-0010), the `project-rules.md` surface, and the
migration function every later group and the dogfood depend on. G1 (upgrade
syncs all agents) and G2 (pointer into all files) are independent mechanism
fixes. G3 wires the templates + recipes onto G0's surface. G4 dogfoods the whole
thing on the self-repo and releases.

Standard verification per group: `npm test` (config `test_command`), reading
actual output per Rule 12. New tests land in the same group as the code.

---

## Group 0 — Contract + migration core + BUG-027 (Sequential; blocks all)

**Sequential.** No external deps. Commit: `feat(instructions): project-rules.md surface + migration contract (ADR-0010)`

- **ADR-0010** — "the instruction file is a projection of `specs/`, never
  authored." Records: `## Project Extensions` retired as an authoring surface;
  project prose → `specs/project-rules.md` (pointer model); the upgrade-preservation
  contract changes from "preserve the section" to "migrate-then-point."
- New OKF doc type for `specs/project-rules.md` (`type: ProjectRules` or reuse an
  existing type — decide in G0; register in `core/lib/okf*` conformance).
- **Migration function** (`migrateProjectExtensions(instructionFile, specsDir)`):
  1. Parse the `## Project Extensions` region from an instruction file.
  2. Drop content that `specs/config.md` already covers (release/publish command
     prose — `release_command`, `publish_target`, `release_flow`).
  3. Append the remaining prose to `specs/project-rules.md` (dedup — never double-append
     if already present; idempotent).
  4. Replace the `## Project Extensions` region with the managed pointer block.
  Content-preserving: nothing authored is ever dropped without a config-covered
  equivalent. Dry-run aware.
- **BUG-027**: add the missing trailing `|` to the `sync-config` recipe row in
  `adapters/{opencode,codex}/instructions/{surfaces,AGENTS}.md` (4 files).
- Unit tests: migration preserves prose / drops config-covered / injects pointer /
  idempotent; BUG-027 rows well-formed.

Verify: `npm test` green; new migration suite passes.

---

## Group 1 — upgrade syncs all installed agents (cause #1) (Sequential)

**Sequential.** Depends on nothing in G0 (independent). Commit: `fix(upgrade): refresh every installed agent, not just one`

- `momentum upgrade` (no `--agent`) iterates `installed.json.agents` and upgrades
  EACH agent's surfaces (currently it upgrades only the default/one agent). `--agent X`
  still targets one. Orphan-cleanup stays per-agent (Phase 22c / ADR-0007) so agents
  don't clobber each other.
- Ecosystem-root guard (BUG-016) + per-agent lock (ADR-0007) preserved.
- Tests: a project with `agents: { claude-code, opencode }` → one `upgrade` run
  refreshes BOTH; a stale second-agent instruction file gets the current managed rules.

Verify: `npm test` green; two-agent upgrade test passes.

---

## Group 2 — ecosystem pointer into all instruction files (cause #2) (Sequential)

**Sequential.** Independent of G0/G1. Commit: `fix(ecosystem): inject the pointer into all agent instruction files`

- `core/ecosystem/lib/pointer.js`: `ensurePointerInjected` injects/refreshes the
  `<!-- ecosystem:begin -->` block into EVERY present primary-instruction file
  (CLAUDE.md AND AGENTS.md, …), not just the first candidate. Preserve BUG-022's
  upgrade re-injection; extend it to all files.
- Wire the multi-file injection into `init`/`upgrade`/ecosystem `add` paths.
- Tests: a member repo with both CLAUDE.md + AGENTS.md → pointer present in both;
  idempotent; upgrade preserves both.

Verify: `npm test` green; pointer-all-files test passes.

---

## Group 3 — templates + recipes (Sequential)

**Sequential.** Depends on G0 (surface + migration). Commit: `feat(recipes): instruction files project specs/; config-driven release`

- Instruction templates (`core/specs-templates/CLAUDE.md`, `adapters/*/instructions/AGENTS.md`):
  `## Project Extensions` becomes the managed **pointer block** — "Project-specific
  rules & session-start audits → see `specs/project-rules.md`" — identical across all.
- `install`/`upgrade` run `migrateProjectExtensions` on existing files (G0) so an
  install that already had authored extensions migrates cleanly.
- `/start-project` authors `specs/project-rules.md` at founding (project-specific
  prose from the founding brainstorm).
- `/complete-phase` release section runs FULLY from `config.md` (`release_command`,
  `publish_target`, `release_flow`) — drop the residual per-project prose expectation.
- `/validate` invariant: founded ⟹ `specs/project-rules.md` exists.
- Regenerate adapter surfaces; re-baseline the drifted fingerprints.

Verify: `npm test` green; fresh multi-adapter install → identical managed rules + pointers.

---

## Group 4 — Self-repo dogfood + release (Sequential)

**Sequential.** Depends on G0–G3. Commit: `docs: Phase 28 retrospective + v0.35.0`

- **Dogfood**: run the migration on momentum's own CLAUDE.md + AGENTS.md → move
  their Project-Extensions prose (release checklist, self-audits, meta-constraint)
  into `specs/project-rules.md`, drop the config-covered release commands, replace
  with the pointer. Sync BOTH agents (claude-code + opencode) via the G1 upgrade-all.
- **Assert consistency**: `CLAUDE.md` vs `AGENTS.md` managed region identical modulo
  the intended per-adapter substitutions (TodoWrite→task tool + the adapter surface
  sections); both carry the ecosystem pointer + the project-rules pointer. Add a
  self-repo guard test pinning this invariant.
- Flip stale backlog statuses: BUG-024/025/026, ENH-061 → `resolved` (tracking drift
  from Phases 26–27 completion).
- Docs (recipes, site/README if a user-facing surface changed); retrospective with
  `## Verification Evidence` (Rule 12); version bump v0.35.0.

Verify: full `npm test` green; `CLAUDE.md` ≡ `AGENTS.md` (managed + pointers);
`specs/project-rules.md` holds the migrated content; evidence captured.
