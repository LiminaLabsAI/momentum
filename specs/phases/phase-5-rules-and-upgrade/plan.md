---
type: Plan
---

# Phase 5 — Rules & Upgrade Safety: Implementation Plan

```
# Sequential: Group 0 → (Groups 1 + 2 + 3 in parallel) → Group 4 → Group 5
```

---

## Group 0 — Template Foundation

**Sequential. Blocks Groups 1, 2, 3.**
External dependencies: none
Commit: `feat(template): scaffold Rules 10/11 and Project Extensions marker`

Establish the structural skeleton. Content for new rules lands in Group 1; upgrade logic that depends on the marker convention lands in Group 2. This group exists to lock the conventions all parallel work will rely on.

### 0a. Add `## Project Extensions` marker to `core/specs-templates/CLAUDE.md`

At the bottom of the template, after the `## Constraints` section, add:

```markdown
---

## Project Extensions

> Everything below this heading is preserved across `momentum upgrade`.
> Add project-specific navigation, rules, cross-repo references, etc. here.
```

### 0b. Add `## Project Extensions` marker to `core/agent-rules/project.md`

Same convention, same heading, same instruction line.

### 0c. Add Rule 10 + Rule 11 stub headings to template

Insert after Rule 9 in `core/specs-templates/CLAUDE.md`:

```markdown
### Rule 10: Architecture Specs Stability (monorepo only)

_(content lands in Group 1)_

### Rule 11: Evaluator Discipline — Lock Evaluators Before Loops

_(content lands in Group 1)_
```

### 0d. Update rule count references (9 → 11)

Grep template for "Rules 1-9", "9 rules", etc. and update.

### 0e. Add `[EVALUATOR]` to entry types table in Rule 8

Add a row to the entry types table. Full Rule 8 expansion happens in Group 1.

---

## Group 1 — Rules Content & Hardening

**Parallel with Groups 2 and 3.**
External dependencies: Group 0 complete
Commit: `feat(rules): write Rules 10/11, harden Rules 2/6/8/10/11, expand naming conventions`

The bulk of the cognitive work — writing rule bodies and persuasion-hardening.

### 1a. Write Rule 10 body (ENH-011)

Source content: `specs/backlog/details/ENH-011.md`. Key points to capture:
- READ specs as stable reference during phase implementation
- NEVER modify specs based on implementation discoveries
- Log gaps as `[ARCH_CHANGE]` in phase history
- At phase completion: additive changes go directly into specs (no ADR); decisional changes require ADR amendment first
- Mark the rule `(monorepo only)` so single-package projects know to skip

### 1b. Write Rule 11 body (ENH-011)

- Define evaluation set (fixed corpus with known-good outputs)
- Define the scalar (single number that improves or doesn't)
- Commit evaluator to `tests/benchmarks/` with a version tag
- Build the loop AFTER the evaluator is committed
- NEVER change the evaluator while the loop is being optimized

### 1c. Expand Rule 8 (ENH-012)

Add a "What counts as meaningful" subsection listing explicit triggers per entry type:

- ADR created or status changed → `[DECISION]`
- Phase scope added/reduced → `[SCOPE_CHANGE]`
- Bug/tech-debt/enhancement added to backlog → `[DISCOVERY]`
- New feature added to phase plan → `[FEATURE]`
- Architectural pattern or integration approach changed → `[ARCH_CHANGE]`
- Locked evaluator defined or evaluation set changed → `[EVALUATOR]`
- Anything else worth recording → `[NOTE]`

Add an explicit step: after writing a history entry, check `specs/decisions/impact-map.json` and add new topics.

Reference `scripts/check-history-reminder.sh` as a safety net.

### 1d. Persuasion-harden Rule 2 (auto-update tracking)

Add a Red Flags table:

| If you find yourself thinking… | …STOP and re-read the rule. |
|---|---|
| "I'll batch the tracking updates at the end" | Track now — context fades fast |
| "This change is too small to log" | Log it — small changes accumulate into invisible drift |
| "The diff makes it obvious what changed" | The diff is not the changelog; logs explain *why* |

Add 3+ anti-rationalization counters specific to Rule 2.

### 1e. Persuasion-harden Rule 6 (git lifecycle)

Red Flags + counters covering:
- "Just one commit to main"
- "I'll create the branch after"
- "The hook is in the way" (re: --no-verify)
- "Force push is fine, nobody else is on this branch"

### 1f. Persuasion-harden Rule 8 (history logging)

Red Flags + counters covering:
- "I'll write the history at the end of the phase"
- "This decision isn't important enough to log"
- "I already mentioned it in the commit message"

### 1g. Persuasion-harden Rule 10 (architecture stability)

Red Flags + counters covering:
- "I just need to update one field, not a real change"
- "It's faster to fix the spec than to log the gap"
- "The implementation diverged because the spec was wrong" (use ADR — don't silently update)

### 1h. Persuasion-harden Rule 11 (evaluator discipline)

Red Flags + counters covering:
- "Just one tweak to the eval set so this run looks better"
- "We'll lock the evaluator after we know what works"
- "The current eval doesn't measure what we actually care about" (correct — but freeze it before optimizing)

### 1i. Add ENH-013 naming conventions

In the Naming Conventions section of the template:
- Add `infra:` to the conventional commit types row
- Add an SLA column to the priority table (P0: <1 day, P1: <1 week, P2: <1 phase, P3: best-effort)
- Add a row to the git branches table for delete-after-merge convention

### 1j. Mirror all rule changes to `core/agent-rules/project.md`

The agent-rules file is the canonical source for the agent; CLAUDE.md is the canonical source for the human. Keep them in sync.

---

## Group 2 — Upgrade-Safe CLI (FEAT-011 + ENH-010)

**Parallel with Groups 1 and 3.**
External dependencies: Group 0 complete (marker convention defined)
Commit: `feat(cli): marker-based CLAUDE.md upgrade preserving project extensions`

The mechanical work to make `momentum upgrade` non-destructive to user content.

### 2a. Add `partitionByMarker(content)` helper

In `bin/momentum.js` (or `adapters/claude-code/adapter.js`):

```js
function partitionByMarker(content, marker = '## Project Extensions') {
  const idx = content.indexOf('\n' + marker);
  if (idx === -1) return { managed: content, extensions: null };
  return {
    managed: content.slice(0, idx).replace(/\n+$/, ''),
    extensions: content.slice(idx + 1)
  };
}
```

### 2b. Marker-aware CLAUDE.md upgrade

When upgrading a file with a `## Project Extensions` heading:
- Read existing file, partition into `{managed, extensions}`
- Read new template, partition the same way (template's extensions block is just the heading + scaffold instruction)
- Write: `newTemplateManaged + '\n\n' + existingExtensions`
- Skip if managed section is byte-identical (no-op)

### 2c. Pre-marker fallback path

If the existing CLAUDE.md has no `## Project Extensions` heading:
- Back up as `CLAUDE.md.bak`
- Write the fresh template (which includes the marker)
- Append the *entire* original file content under `## Project Extensions`
- Print: `migrated CLAUDE.md to marker format — original backed up as CLAUDE.md.bak`

### 2d. Apply same logic to `.agent/rules/project.md`

Same partition + replace + fallback flow.

### 2e. Update upgrade summary output

After upgrade, report counts:
- N commands replaced (X with `.bak`)
- CLAUDE.md managed section: updated / unchanged / migrated-to-marker
- agent-rules project.md: same three states
- N hook scripts updated
- Project extensions preserved: yes/no/n-a

---

## Group 3 — `--agent` Flag Rename (ENH-008)

**Parallel with Groups 1 and 2.**
External dependencies: none
Commit: `feat(cli)!: rename --coding-agent to --agent (breaking)`

### 3a. Rename flag parsing in `bin/momentum.js`

- Replace `--coding-agent` argv parsing with `--agent`
- If `--coding-agent` is encountered, exit 1 with: `Error: --coding-agent has been renamed to --agent. Run: momentum <cmd> --agent <name>`

### 3b. Update `--help` output

All references to `--coding-agent` in help text → `--agent`.

### 3c. Update README

All install/upgrade examples in README.md use `--agent`.

### 3d. Grep + replace in command files

Any `core/commands/*.md` files referencing `--coding-agent` → `--agent`.

### 3e. Update `adapters/claude-code/adapter.js`

If it reads the flag value, rename the variable / parsing logic.

### 3f. Update `core/specs-templates/CLAUDE.md`

If the template has any examples mentioning the flag, update them.

---

## Group 4 — Wiring & Dogfooding

**Sequential.**
External dependencies: Groups 1, 2, 3 complete
Commit: `chore: dogfood — migrate momentum's own CLAUDE.md to marker format`

Apply the new patterns to momentum's own repo. Catches integration bugs Groups 1–3 missed.

### 4a. Migrate momentum's own `CLAUDE.md` to marker format

The current `momentum/CLAUDE.md` mixes generic rules (1-8) with momentum-specific ones (Rule 9 npm publish, Rule 10 doc sync protocol). Reorganize:
- Keep Rules 1-8, 10, 11 (the new generic ones from Group 1) above the marker
- Move Rule 9 (npm publish) and Rule 10's old content (doc sync) under `## Project Extensions`
- Note: this repo's "Rule 9" stays project-specific. Rules 10/11 from this phase are generic and live above the marker.

### 4b. Smoke test: `momentum init` against scratch dir

```bash
cd /tmp && rm -rf momentum-smoke && mkdir momentum-smoke && cd momentum-smoke
node /path/to/bin/momentum.js init --agent claude-code
# Verify: all 11 rules present, marker present, naming conventions extended
```

### 4c. Smoke test: `momentum upgrade` preserves extensions

Take the scratch project from 4b, add content under `## Project Extensions`, modify a managed rule, run `momentum upgrade`, verify:
- Managed rule restored to template version
- Extensions preserved byte-for-byte

### 4d. Smoke test: pre-marker migration

Synthesize a CLAUDE.md without the marker, run upgrade, verify `.bak` created and old content appended under the new marker.

### 4e. Smoke test: old flag errors

```bash
node bin/momentum.js init --coding-agent claude-code
# Expect: exit 1, message about renamed flag
```

---

## Group 5 — Release Verification

**Sequential.**
External dependencies: Group 4 complete
Commit: `chore(release): v0.6.0 — Rules & Upgrade Safety`

### 5a. Update `CHANGELOG.md`

Add v0.6.0 entry with explicit "## Breaking Changes" subsection calling out the flag rename.

### 5b. Update `specs/status.md`

Mark Phase 5 complete; update latest release to v0.6.0; clear "Next Actions" block.

### 5c. Update `specs/planning/roadmap.md`

Mark Phase 5 complete; add a Phase 6 placeholder ("Execution Engine — subagents, TDD, verification rigor").

### 5d. Update `README.md`

All flag examples use `--agent`. Mention the marker-based upgrade safety in the upgrade section.

### 5e. Run `/sync-docs` (per Rule 10)

Reconcile any drift between specs based on Phase 5 history entries.

### 5f. Run `/complete-phase`

Handles tag + `npm publish --access public` per project Rule 9.

---

## Verification Matrix

| Acceptance Criterion | Group | Verifying Command |
|---|---|---|
| Fresh init produces 11-rule CLAUDE.md w/ marker | 4 | `grep -c "^### Rule" /tmp/smoke/CLAUDE.md` returns 11 |
| Upgrade preserves extensions | 4 | `diff` of extensions block before/after upgrade |
| Pre-marker migration safe | 4 | `.bak` exists; new file has marker; old content under marker |
| `--agent` works | 4 | exit 0 |
| `--coding-agent` errors | 4 | exit 1 with rename message |
| 5 hardened rules each have ≥3 counters + Red Flags table | 1 | Manual review |
| Rule 10 distinguishes additive vs decisional | 1 | grep template for "additive" and "decisional" |
| Rule 11 mandates evaluator commit | 1 | grep template for "before the loop" or equivalent |
| Rule 8 has triggers + `[EVALUATOR]` | 1 | grep template for "EVALUATOR" |
| CHANGELOG flags breaking change | 5 | grep CHANGELOG for "Breaking Changes" under 0.6.0 |
| v0.6.0 on npm | 5 | `npm view @avinash-singh-io/momentum version` |
