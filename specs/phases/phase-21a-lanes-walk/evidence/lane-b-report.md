---
type: Evidence
---

# Lane B (G3) — Trial Session Report

> Captured verbatim by the conductor from the Lane B agent session's final
> report (2026-07-03). Lane B ran in worktree `.claude/worktrees/lane-b` on
> branch `phase-21a-lanes-walk-g3`, concurrently with Lane A.

## Timing
- **Start:** 00:39:28 · **End (commit confirmed):** 01:32:10 · **Wall clock: ~53 min**
- **Stall gap:** ~00:44 → ~01:27 (~43 min) — background Playwright Chromium download + coordinator interrupt. **Active working time ≈ 10 min.**
- **`npm ci` cold start: 16 seconds** (00:42:28 → 00:42:44). The real cold-start cost was NOT npm ci — it was **Playwright browsers** (~130 MB chromium + 92.4 MB headless shell), which a fresh worktree's `npm ci` does not install. See discovery below.
- **Tracking-file updates (contention-overhead metric): 1 min 41 s** (01:30:05 → 01:31:46, all four files).

## Phase resolution (Step 0 evidence)
- Branch: `phase-21a-lanes-walk-g3`. Directory `specs/phases/phase-21a-lanes-walk-g3/` does **not** exist (verified: "No such file or directory").
- Resolved phase: **phase-21a-lanes-walk**, via the **status.md Active Phase table fallback** (my row: `21a · G3 — Lane B (docs: site page + README) | phase-21a-lanes-walk-g3`). Rule 15 confirms: branch binding first, table fallback for non-binding branches.
- Mechanical resolver output, verbatim:

> HISTORY REMINDER: 'specs/status.md' was modified — if this reflects a decision, scope change, or discovery, append an entry to the active phase history (specs/phases/phase-21a-lanes-walk/history.md — resolved from the status.md Active Phase table; the current branch does not bind to a phase directory).

## Files changed (7 — commit stat: 195 insertions, 4 deletions)
1. `site/src/content/docs/parallel-work.md` — **new page** (lane concept, recursive plan graph, branch↔phase binding + status.md board, substrate by detection with 2-command `git worktree` example / treehouse / GitButler, Rule 6 Landing Order + mermaid landing diagram, lane-scoped tracking table, off-lane work, Run/Fly "What's coming")
2. `site/astro.config.mjs` — sidebar: **"Start here" group, after Concepts**, label "Parallel work" (it's core workflow, not multi-repo Orchestration; that group is explicitly cross-repo)
3. `README.md` — new "Parallel workstreams" section (5 lines + link) **between "Orchestration primitives" and "The 13 autonomous rules"** — groups the scaling-out story: multi-project, then multi-lane
4. `specs/phases/phase-21a-lanes-walk/tasks.md` — Group 3's 3 boxes → `[x]` only
5. `specs/status.md` — g3 row Progress → `done — awaiting landing` only
6. `specs/phases/phase-21a-lanes-walk/history.md` — appended one `[FEATURE]` entry
7. `specs/changelog/2026-07.md` — appended one bullet at end of `## 2026-07-03` list

## Verification (Rule 12)
- Node: **no nvm on this machine** (the brief's `source ~/.nvm/nvm.sh` path doesn't exist); system node is **v26.4.0** (≥22.12), used directly.
- Final build: **exit 0**, `13 page(s) built in 2.81s`, pagefind indexed 13 HTML files.
- Dist check: `dist/parallel-work/index.html` = **61,846 bytes**, body starts `<p>You have three features in flight…`, **1 inline mermaid SVG**, all 7 content probes true (title ×2, "main is the runway", "substrate by detection", "myapp-search", "lane A done", "Off-lane work", "momentum lanes"); sidebar `href="/parallel-work/"` present site-wide; pagination Concepts ← page → Skills.

## DISCOVERY candidate handed to the conductor (filed post-landing by the conductor)
**Site build silently emits EMPTY page bodies for all mermaid pages when Playwright's chromium-headless-shell is missing — and still exits 0.** First build here: exit 0, `/parallel-work/`, `/concepts/`, `/swarm/`, `/orchestration/`, `/skills/` all shipped with empty `sl-markdown-content` divs (~24 KB shells). Error only visible mid-log: `browserType.launch: Executable doesn't exist at …/ms-playwright/chromium_headless_shell-1223/…` from mermaid-isomorphic. Fix: `npx playwright install chromium-headless-shell` (note: plain `install chromium` is NOT sufficient) + clear `node_modules/.astro`/`.astro` caches (empty renders get cached). Risk: a fresh CI/env could silently deploy a gutted site; suggest a postbuild non-empty-body check. Also flagged: `site-docs` (a Topics value used in the lane's history entry) is not in `specs/decisions/impact-map.json`.

## Lane discipline
- Touched **only** own row/section in shared files: tasks.md Group 3 only, status.md g3 row only, pure appends to history/changelog. No cross-lane edits; never left the worktree; no checkout/switch/push/merge; explicit `git add` paths only.

## Confusion/misorientation events
- **Zero** phase/branch/file-ownership confusion — branch → phase resolution was unambiguous throughout.
- One honest near-miss on **verification** (not orientation): the first "build green" claim would have been false-positive — exit 0 with an empty page body. Caught by grepping the dist HTML per the brief's Step 2.2 content probes.

## Commit
- **`2e657773dfe0332b3109d8f96ddd2dcfc48688c7`** — `docs(site): working on multiple things at once` on `phase-21a-lanes-walk-g3`. Tree clean. **Not pushed**, per the brief.
