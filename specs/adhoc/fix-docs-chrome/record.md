---
type: Ad-hoc Record
---

# Ad-hoc Work Record: fix-docs-chrome

> **Type**: quick-task
> **Created**: 2026-07-06
> **Branch**: fix/docs-chrome (lane `fix-docs-chrome`)
> **Backlog**: operator-directed docs-chrome fixes (no backlog IDs)
> **Status**: shipped

## Scope (operator-directed, 4 items)

All in `site/src/layouts/DocsLayout.astro` (the redesign's custom docs shell):

1. **"Open in Claude" button removed** from doc headers — no cloud-vendor
   preference on the docs (operator directive); `.kbtn` CSS dropped with it.
2. **"Edit this page" link removed** from the TOC rail + `editUrl` const and
   `.toc-edit` CSS dropped. (Note: the link pointed at GitHub's fork-and-PR
   edit flow — the public could propose, never directly publish — but the
   operator prefers it gone.)
3. **Docs topbar → floating pill**, replicating the landing nav: sticky
   transparent wrapper (14px float) around a `.tb-pillbar` glass pill
   (radius 999px, glass tokens, shadow). Sticky offsets preserved by
   redefining `--tb-h` as the TOTAL header height (84px) with the pill on
   its own `--tb-pill-h` (56px) — sidebar/TOC/scroll-margin/mobile-drawer
   offsets all key off `--tb-h` and needed no per-site changes.
4. **Sidebar group labels readable as headings**: `.side-label` 10px/`--fg-3`
   → 14px/700/`--fg-1` (also lifts the "On this page" label, consistent).

## Verification Evidence

- Site build green: 12 pages, dist content gate passed.
- `dist/getting-started/index.html`: zero matches for "Open in Claude" /
  "Edit this page"; `tb-pillbar` present.
- No stray references: `editUrl` / `kbtn` / `toc-edit` count = 0 in the
  layout after edit.
- Visual confirmation on the deployed site after landing (operator).
