---
type: Planning Note
---

# Future Phase — Context Economy (DEFERRED)

> Status: deferred. Not currently needed. Pull off the shelf when a trigger below fires.

## Originating context

The user is not facing cost pressure today on their current Claude Code plan; agents currently navigate momentum specs correctly without hallucination. The concern that prompted this brief is the opposite of cost — losing that navigation quality if we optimize prematurely. We deferred all three context-economy proposals and kept this plan on the shelf so that, when a concrete trigger fires, we restart from a stance that explicitly protects the rule-expansion text, the append-only history contract, and the primary-source-as-canonical-answer invariant.

## When to revisit (triggers)

Pull this off the shelf only when ONE of these is observable evidence, not vibes:

- **Phase history pressure (single-repo):** any individual `specs/phases/phase-*/history.md` crosses ~500 lines, OR the cohort total (today: 871 lines across 10 files) passes ~2000 lines AND a `/sync-docs` or `/complete-phase` run is observed re-reading multiple full phase histories in one session.
- **Ecosystem cross-repo orientation pressure:** a single Claude Code session working across the cerebrio constellation loads ≥3 member `status.md` / `backlog.md` / `history.md` files in the first ~20 turns just to orient, AND a representative "which member should I touch next" query costs ≥2× the equivalent single-repo orient cost (measured, not estimated).
- **Second ecosystem user exists.** Building an ecosystem router for one constellation is over-fit. Defer until at least one non-cerebrio ecosystem adopter exists.
- **Install-base multiplication is material:** template surfaces (`core/specs-templates/CLAUDE.md` at 337 lines, plus templated scaffold) ship verbatim to every `momentum init`. When ≥~50 downstream projects exist AND a downstream user reports per-session orientation cost concerns, the multiplier matters.
- **Phase 10 (Hardening & Activation) has shipped.** Rules are persuasion-hardened and SessionStart auto-activation is live, so any new rule enforces from byte zero of every session.
- **A user reports an agent re-reading the same primary source ≥2 times in one session** — a signal the file is too large to retain against other context demands.

Triggers are size-based and behaviour-based. They are NOT time-based. Do not start this phase on a calendar.

## Quality invariants (non-negotiable)

These are what we will NOT break, regardless of cost savings:

1. **Rule expansion text stays inline and verbatim.** The Why / Red Flags / Anti-Rationalization subsections under every rule in `CLAUDE.md` (both project and `core/specs-templates/CLAUDE.md`) are what stop Rules 2, 6, 8, 10, 11, 12 from being rationalized past under pressure. No slimming, no consolidation, no cross-reference-collapsing.
2. **Rule 1 mandate preserved verbatim:** "First file to read: ALWAYS `specs/status.md`." Line-for-line. Any added guidance lands BELOW it as commentary, never edited into it.
3. **history.md is append-only.** `[DECISION]`, `[ARCH_CHANGE]`, `[SCOPE_CHANGE]`, `[DISCOVERY]`, `[EVALUATOR]` entries are load-bearing constraint records and remain authoritative in place forever. Never archived, summarised, compacted, paraphrased, or backfilled.
4. **Primary sources remain the canonical answer location.** `status.md`, `history.md`, `backlog.md`, ADRs, member `specs/` always answer. Derived files (indexes, routers, digests) at most ROUTE — they never answer authoritatively, and no read order is allowed that flips this.
5. **Backlog IDs (`BUG-NNN` / `FEAT-NNN` / `TD-NNN` / `ENH-NNN`) remain resolvable** from commits, `status.md`, and history entries via the active `backlog.md`. Resolved rows stay readable in place; any stub left behind must keep the ID grep-able.
6. **`## Project Extensions` marker contract is untouched.** The line shape, position, and `momentum upgrade` parsing semantics are load-bearing. Anything added lands ABOVE the marker, inside the managed region.
7. **Single-repo behaviour is identical when no ecosystem root is present** (Phase 9 [DECISION] — additive parallel module). No new rule, file, or read order activates in single-repo mode.
8. **Cross-repo ownership boundary is non-negotiable.** Nothing in this phase writes into a member repo's `specs/`. Rule 9 multi-repo block and the Phase 9 "never writes into a member's specs/" invariant remain in force.
9. **Templates under `core/specs-templates/`, `core/agent-rules/`, `core/commands/`, `core/scripts/` stay generic.** No `cerebrio`, no `sapience`, no momentum-specific paths or IDs.
10. **Rule 8 → `impact-map.json` linkage survives.** After a history append, the agent still updates `impact-map.json` directly. No optimization replaces or merges it into a different router.
11. **Per Rule 11: evaluator locked BEFORE any optimization runs.** Quality floor is non-negotiable; if it trips, the optimization rolls back regardless of byte savings.

## Scope — the safe wins

When this phase is pulled off the shelf, ship in this order. Each item is bounded, additive, and preserves the invariants above.

### 1. Ecosystem-only router: `STATE.md` at the ecosystem root

A single generated artifact, `<ecosystem-root>/STATE.md`, summarising "which member changed, where to look, what's open" so an agent crossing N member repos does not pre-load N full `status.md` / `backlog.md` / `history.md` files just to orient. The router emits per-member counts and the *titles* of the last few `[DECISION]` / `[ARCH_CHANGE]` / `[SCOPE_CHANGE]` entries — never their bodies — and every row ends with the primary-source path the agent must read before acting. A `## Ecosystem Orientation` block in `CLAUDE.md` (both project and template) gates use on "only when an ecosystem root is present," explicitly forbids quoting `STATE.md` in answers/commits/PRs, and treats `STATE.md` as absent if older than 1 hour or banner-missing.

*Preserves:* primary-source canonical answer (router never answers), single-repo identical behaviour (no `STATE.md` exists there), cross-repo ownership (write-set is exactly `STATE.md`), append-only history (read titles only), Rule 1 verbatim (router consulted *after* `status.md`), `## Project Extensions` contract (block added above the marker).

### 2. Section-Map headers + read-selectively guidance — additive, no Rule 13

Add machine-regenerated `<!-- section-map:start --> … <!-- section-map:end -->` headers (collapsed under `<details>` for human readers) at the top of long-form primary sources (`status.md`, every phase `history.md`, `backlog.md`, ADRs). The header lists each section's line range. Pair this with a single short **guidance paragraph** under Rule 1's existing verbatim mandate (NOT a new rule, NOT a slimming of existing rule expansions) saying: "For orientation, the last ~30 lines of `status.md` typically suffice; load older sections via offset+limit when historical context is needed." Command recipes (`/sync-docs`, `/complete-phase`, `/track`, `/start-phase`) are updated to use `Read(file, offset, limit)` against the active phase history's targeted entries rather than full-file loads. A `build-section-map.sh` script regenerates ONLY the bytes between the two markers and refuses to run if markers are missing or moved.

*Preserves:* rule expansion text (no Rule 13, no consolidation, no shrinkage), Rule 1 verbatim (mandate untouched, guidance is adjacent commentary), append-only history (header is the ONLY regenerated region; entries are read, never written), primary-source canonical (offset+limit reads still hit the primary source — they just hit less of it).

### 3. Locked evaluator BEFORE either of the above

Per Rule 11: commit `tests/benchmarks/context-economy-v1/` before any other context-economy work. Scalar = mean kB read per task across a fixed corpus of representative flows (`/track` a bug, `/sync-docs`, `/complete-phase`, mid-phase code edit + history append, `/start-phase` brainstorm, cross-repo orient). The evaluator ALSO measures task-completion correctness against a known-good output set with a hard quality floor. Any quality regression vetoes the optimization regardless of byte savings. Version-bump to `v2` if the eval is wrong; never patch `v1`.

*Preserves:* Rule 11 verbatim, and the user's stated priority — quality first, cost second.

## Proposals we explicitly REJECTED and why

### Rejected: Rule 13 "Read Selectively" as a new top-level rule with full Why / Red Flags / Anti-Rationalization expansion

The proposal added a thirteenth always-loaded rule with the full persuasion-hardening apparatus to *both* the project and template `CLAUDE.md`. The rule's intent is sound, but the cost-vs-quality math inverts: adding ~40–60 lines of rule text to a file the audit explicitly flags as multiplied across every session in every downstream project, in service of an optimization the user has no current need for, makes the file *more* expensive, not less, until the optimization is actually being exercised. We keep the underlying behaviour (selective reads via Section Map + command-recipe updates) but ship it as **guidance under Rule 1** plus per-recipe instructions, not as Rule 13. If a future audit shows agents systematically whole-file-reading despite the guidance, *then* promote it to a rule.

### Rejected: Lifecycle & Archival (Proposal 3) — the entire angle

Three independent reasons:

1. **No trigger fires today, by the proposal's own thresholds.** Max history is 161 lines (Phase 7a) vs the 500-line trigger; backlog is 81 lines vs 500; changelog is ~17KB across 3 months vs 500-line combined. Building the mechanism now is the prototypical premature optimization.
2. **The closest-to-load-bearing entry types — `[DECISION]`, `[ARCH_CHANGE]`, `[SCOPE_CHANGE]`, `[DISCOVERY]`, `[EVALUATOR]` — are exactly the ones the proposal carves out from archival.** The remaining archivable types (`[NOTE]`, `[FEATURE]`) are also the lowest-signal entries. The savings ceiling is therefore low, while the implementation surface (archive command, invariant checker, pointer headers, four-surface coverage, ADR, tests, template propagation) is large.
3. **The blast radius is the entire install base.** A bug in `core/scripts/archive.sh` corrupts history files in every `momentum init` install. The proposed mitigations (round-trip invariant, atomic rename, CI invariant check) are correct but the residual risk against the multiplied surface remains higher than the savings justify until a real downstream project actually crosses a threshold.

Park this angle until a real-world momentum project (not this one) reports concrete bounded-window pressure on a single oversized `history.md` or `backlog.md`. Reopen it then, not before.

### Rejected: any router or index that becomes the primary read path

`specs/.index/` style routers in single-repo mode (Proposal 1's `history-index.json`, `backlog-index.json`, `adr-index.json`, `claudemd-index.json`) are seductive but cross a line — they create four new files that an agent will, under pressure, treat as authoritative. The Section Map header (kept above) gives ~80% of the navigation benefit while sitting *inside* the primary source where it cannot be mistaken for an independent answer. Re-consider per-file router files only after the Section Map approach has been measured and shown insufficient.

## Deliverables (ordered)

When the phase is started:

1. **Locked evaluator first** — `tests/benchmarks/context-economy-v1/` committed and version-tagged BEFORE any other work. Bytes-read scalar + quality-correctness floor over a fixed 6-task corpus. Per Rule 11.
2. **Baseline capture** — run the evaluator against `main` and commit the numbers as the pre-optimization reference.
3. **Section Map header convention** — `<!-- section-map:start --> … <!-- section-map:end -->` block applied to `specs/status.md`, every existing `specs/phases/phase-*/history.md`, `specs/backlog/backlog.md`, ADR template. Collapsed under `<details>` for human readability.
4. **`core/scripts/build-section-map.sh`** — POSIX shell + awk, regenerates ONLY the bytes between the two markers, refuses to run if markers are missing or moved, idempotent, runs in <1s.
5. **Section Map `--check` mode** — wired into a CI step and `/complete-phase` (blocks completion if any header is stale relative to its primary source).
6. **Rule 1 guidance paragraph** — single short paragraph added BELOW the verbatim Rule 1 mandate in both project and template `CLAUDE.md`, above the `## Project Extensions` marker. Does NOT edit Rule 1 itself.
7. **Command recipe updates** — `/sync-docs`, `/complete-phase`, `/track`, `/start-phase` updated to use `Read(file, offset, limit)` against Section-Map-anchored ranges instead of whole-file reads. Each recipe still re-reads the primary source; it just reads less of it.
8. **Template propagation** — Section Map convention + `build-section-map.sh` + Rule 1 guidance + recipe updates all mirrored into `core/specs-templates/CLAUDE.md`, `core/specs-templates/specs/`, `core/agent-rules/project.md`, `core/scripts/`. Fully generic.
9. **Re-run evaluator** — assert byte reduction AND no quality regression. If quality regresses, roll back regardless of byte savings.
10. **Ecosystem `STATE.md` router (only if trigger 2 also fires)** — `momentum ecosystem state` CLI, fixed router format with banner + path-suffix invariants + length cap, PostToolUse hook regeneration with 5-min mtime gate + silent failure, `## Ecosystem Orientation` block added to both `CLAUDE.md`s above the `## Project Extensions` marker, single-repo no-op enforced in code and test, write-set exactly `{STATE.md}` asserted.
11. **ADR** — `specs/decisions/NNNN-context-economy-via-section-maps-and-ecosystem-router.md` capturing the Why, the rejected alternatives (Rule 13, lifecycle archival, per-file index files), and the locked-evaluator-first discipline.

## Out of scope (explicitly NOT in this phase)

- Removing, shortening, consolidating, or cross-reference-collapsing the Why / Red Flags / Anti-Rationalization subsections under any of Rules 1–12.
- Adding a new always-loaded Rule 13 (the underlying behaviour ships as guidance under Rule 1 + recipe updates, not as a rule).
- Any rewrite of the Rule 1 mandate text. Guidance is adjacent, not edited in.
- Compacting, digesting, archiving, summarising, paraphrasing, or backfilling any `history.md` entry of any type.
- Archival of `[DECISION]` / `[ARCH_CHANGE]` / `[SCOPE_CHANGE]` / `[DISCOVERY]` / `[EVALUATOR]` entries under any condition.
- Pruning resolved rows from `backlog.md`, even via stubs.
- Trimming `status.md`'s Completed Phases table or Recent Changes tail.
- ADR archival, ADR consolidation, or ADR splitting.
- Per-file router/index files (`specs/.index/*.json`) in single-repo mode.
- A global ecosystem-wide index that reaches into member `specs/`.
- Replacing or merging `impact-map.json` with any other router.
- Automatic, hook-driven, or cron-driven archival or compaction.
- Any change to the `## Project Extensions` marker line, position, or upgrade-parsing semantics.
- Project-specific names or paths in `core/specs-templates/`, `core/agent-rules/`, `core/commands/`, `core/scripts/`.
- Any optimization that proceeds without a locked evaluator in `tests/benchmarks/`.
- Any optimization that ships despite a measured quality regression against the locked eval.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Section Map regeneration accidentally rewrites authoritative content. | Generator writes ONLY between two explicit comment markers; refuses to run if markers are missing or moved; CI `--check` mode flags drift. |
| Agent rationalises "I saw the title in the Section Map, no need to read the entry" and skips the primary-source re-read on a load-bearing entry. | Rule 1 guidance paragraph explicitly says "Section Map points; it never answers — re-read the entry by offset+limit before acting on a `[DECISION]` / `[ARCH_CHANGE]` / `[SCOPE_CHANGE]`." Recipes encode this. |
| Section Map adds visual noise to primary sources humans read. | Header collapsed under `<details>`; humans rarely look; agents read it with one small offset+limit at file top. |
| Selective reads miss cross-section context (e.g. an entry depending on the prior entry's Topics line). | Recipes mandate +/- 1 entry of context on history reads; for `status.md`, Active Phase and Next Actions are always read together. |
| Locked evaluator measures bytes but not quality, so agents read less and act worse. | Evaluator has a hard task-completion correctness floor; any regression vetoes the change regardless of byte savings. Per Rule 11. |
| `STATE.md` becomes a quotation source despite the rule. | Banner test (literal disclaimer is first non-heading line); path-suffix test (every row ends with a primary-source path); length cap (200 lines, truncates per-member decisions first); staleness gate (>1 h ignored); explicit "NEVER quote in answers/commits/PRs" rule sentence using the existing Rule 9 / Rule 10 "NEVER" phrasing pattern. |
| `STATE.md` regenerated too often, costing more than it saves. | 5-min mtime gate in PostToolUse hook; `--force` only path for manual regen; <500 ms target for 10-member ecosystem. |
| Single-repo contamination: ecosystem block read by a single-repo agent that misinterprets it. | Explicit "only when an ecosystem root is present" guard sentence at the top and a "this block does not apply" sentence at the bottom; both ship in the template. |
| Template propagation lag — downstream projects on older momentum versions don't get the improvement. | Acceptable: they continue to work as today; they just don't get the cost reduction. Release notes call this out. `momentum upgrade` is the mechanism. |
| Premature optimization: starting this phase before a trigger fires. | The trigger list at the top is concrete and size/behaviour-based. If no trigger has fired, do not start. |

## Notes from the originating conversation

- The user explicitly stated they are NOT facing cost constraints on their current Claude Code plan.
- The user's explicit worry was the inverse: losing the current quality, where agents navigate specs correctly without hallucination.
- The user asked for this plan to be READY FOR THE FUTURE, not implemented now.
- Of the three proposal angles audited, only the ecosystem `STATE.md` router and the (subset of) selective-loading work survive the quality bar — and even those are gated on triggers that have NOT fired. The Lifecycle & Archival angle is rejected in full until a real downstream project shows bounded-window pressure on history or backlog.
- The single multiplication surface where a future cost win is clearly worth the implementation cost is **ecosystem cross-repo orientation**. Single-repo mode is, by the user's own report, working well; we touch it as little as possible.
- The Rule 13 framing was rejected in favour of Rule-1-adjacent guidance because adding a new always-loaded rule with full persuasion-hardening expansion to a file flagged for install-base multiplication makes that file *more* expensive, not less, until the optimization is being exercised.
- Locked evaluator first, always. If the eval regresses on quality, the optimization rolls back — no exceptions, no override, regardless of byte savings.
