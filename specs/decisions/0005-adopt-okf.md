# ADR-0005: Adopt OKF v0.1 as the Specs Storage Format

> **Status**: Accepted (2026-07-05)
> **Phase**: phase-24-okf-adoption
> **Deciders**: operator + agent (brainstormed 2026-07-05, operator-approved)

## Context

Momentum's spec layer is markdown everywhere except two JSON knowledge
files: `specs/phases/index.json` (per-phase status/topics/deps — consumed
by the waves engine and `/sync-docs`) and `specs/decisions/impact-map.json`
(topic → file/section map — consumed by `/sync-docs`). Both have a history
of drifting from reality precisely because they duplicate state whose
source of truth lives elsewhere (stale `in-progress` entries repaired at
Phase 21a setup; a missing phase entry repaired at Phase 23 setup).

On 2026-06-13 Google Cloud published the **Open Knowledge Format (OKF)
v0.1** — an open, vendor-neutral spec for exactly the pattern momentum's
spec layer already embodies: a directory of markdown concept files with
YAML frontmatter that agents read, write, and navigate. Normative spec:
`github.com/GoogleCloudPlatform/knowledge-catalog`, `okf/SPEC.md`.

OKF v0.1 in one paragraph: every non-reserved `.md` file carries YAML
frontmatter whose only required field is `type` (recommended: `title`,
`description`, `resource`, `tags`, `timestamp`; unknown keys must be
preserved by consumers). `index.md` is reserved for directory listings
(frontmatter only at the bundle root, where it may declare
`okf_version`); `log.md` is reserved for newest-first change history.
Links are ordinary markdown links, bundle-absolute preferred. Consumers
must tolerate unknown types, unknown keys, and broken links.

## Decision

**Every momentum project's `specs/` tree becomes a conformant OKF v0.1
bundle**, and the two JSON knowledge files are retired:

1. **Distributed phase metadata.** Each phase's `overview.md` carries
   frontmatter: `type: Phase`, `status`, `tags` (the old index.json
   topics), `deps` (extension keys are OKF-legal). The waves engine reads
   these; `specs/phases/index.md` becomes a *generated listing* per the
   reserved-file semantics. `specs/phases/index.json` is deleted by
   migration. This removes the duplicated-state drift class: a phase's
   status now lives in the phase's own file, which is also the
   lane-parallel-safe location (Rule 15).
2. **`impact-map.json` → `specs/decisions/impact-map.md`** (`type:
   Impact Map`) holding one markdown table (Topic | File | Section). Its
   only consumers are agents following `/sync-docs`; a table is strictly
   more readable for them.
3. **Type taxonomy** is centralized in `core/lib/okf-types.js` (path
   pattern → `type`, first match wins) and used by migration, the
   conformance checker, and templates. Types are producer-defined per
   OKF; momentum's vocabulary: Status, Backlog, Backlog Detail, Roadmap,
   Planning Note, Decision, Impact Map, Phase, Plan, Task List, Phase
   History, Retrospective, Evidence, Ad-hoc Record, Changelog, Guide,
   Note (fallback).
4. **Migration at `momentum upgrade`** (`core/lib/okf-migrate.js`):
   distribute index.json into phase frontmatter; convert impact-map;
   inject `type` frontmatter into every frontmatter-less `specs/**/*.md`
   (body preserved byte-for-byte; files with existing frontmatter get a
   missing `type` inserted textually, everything else untouched); write
   root `specs/index.md` with `okf_version: "0.1"` + listings for
   `phases/` and `decisions/`; delete both JSON files. Idempotent.
5. **Dual-read with nudge.** CLI readers (waves engine) prefer
   frontmatter and fall back to index.json with a one-line stderr nudge —
   a new CLI must not break inside a not-yet-upgraded project. The
   fallback is removed in a future major.
6. **Zero-dependency YAML subset** (`core/lib/frontmatter.js`): we parse
   only what we emit (string scalars, string lists, quoted forms),
   tolerant reads (unparseable → treat file as opaque, never throw).
7. **`history.md` keeps its name.** It is a non-reserved concept doc
   (`type: Phase History`); OKF's `log.md` is optional and adopting its
   newest-first convention would churn Rule 8 and every recipe for zero
   conformance gain.

## Alternatives Considered

1. **Single registry doc** (`specs/phases/phases.md` table replacing
   index.json) — rejected: keeps the central-file drift + lane-contention
   problems; less OKF-idiomatic (file path = identity).
2. **JSON-migration only, no bundle conformance** — rejected by operator:
   the headline value is `specs/` becoming portable, standard agent
   knowledge, not merely swapping serialization of two files.
3. **Full YAML library** — rejected: momentum is zero-dependency by
   constraint; the emitted subset is tiny and a vendored parser for full
   YAML is attack surface + maintenance for no need.
4. **Adopting reserved `log.md` for history** — rejected (see Decision
   #7); revisitable after adoption settles.

## Consequences

- `specs/` trees are readable by any OKF consumer (Knowledge Catalog,
  visualizers, other agents) with zero momentum knowledge.
- `momentum upgrade` gains its first content-bearing spec migration;
  mitigations: byte-preserving bodies, additive-only, idempotent, behind
  the Phase 20 clean-tree gate so the diff is always reviewable.
- The Claude Code install fingerprint drifts wholesale in Phase 24 G3
  (every specs template) — one explained re-baseline.
- `momentum okf check` gives projects a mechanical conformance gate;
  `/validate` delegates to it.
