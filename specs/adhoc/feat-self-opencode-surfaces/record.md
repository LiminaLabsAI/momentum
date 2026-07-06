---
type: Ad-hoc Record
---

# Ad-hoc Work Record: feat-self-opencode-surfaces

> **Type**: quick-task
> **Created**: 2026-07-06
> **Branch**: feat/self-opencode-surfaces (lane `feat-self-opencode-surfaces`)
> **Backlog**: files BUG-020 (P1 — destructive multi-adapter upgrade)
> **Status**: shipped

## Scope

Give the momentum repo its own opencode surfaces so the toolkit can be
dogfooded from opencode directly (operator hit the gap live: `/brainstorm-phase`
absent in the opencode picker inside the repo — the self-install was
claude-code-only).

## What shipped

- `.opencode/` full surface (23 frontmattered commands, momentum plugin,
  3 reviewer agents + swarm-supervisor, momentum-orient skill).
- Root `AGENTS.md` regenerated: the previous copy was a STALE pre-Phase-23
  hand-rolled Codex variant (still referenced the retired
  `.agent/rules/project.md`); now the current generated rulebook with
  opencode surfaces. Known tension: AGENTS.md is one filename shared by
  codex/antigravity/opencode — the rules body is identical across variants;
  the surfaces section now describes opencode (acceptable for the self-repo,
  where Claude Code is primary and CLAUDE.md is authoritative).
- Lock: agent field now `opencode` with opencode-managed files (see caveat).

## BUG-020 — found the hard way (P1 filed)

The documented "Multi-adapter projects" flow (`upgrade --agent <second>`,
"installing both is additive") is DESTRUCTIVE: orphan cleanup diffed the
claude-code manifest against the opencode write-set and removed all 25
claude-code files (CLAUDE.md included), and the single-`agent` lock flipped.
Recovered with `git restore .claude/ CLAUDE.md` on the lane; end state on
disk is genuinely multi-adapter (both surfaces present, verified). CAVEAT
until BUG-020 is fixed: the lock says `agent: opencode`, so a bare
`momentum upgrade` here maintains opencode files and will treat nothing
claude-code as managed — run self-upgrades with care (checkpoint first),
per the bug's interim guidance.

## Verification Evidence

- Both primaries present: `CLAUDE.md` (claude-code, restored byte-identical)
  + `AGENTS.md` (opencode-generated, marker-aware, Project Extensions
  preserved); `.claude/commands/` intact (23 files); `.opencode/commands/`
  23 files all with description frontmatter.
- `momentum okf check` green; full suite green on the lane — see landing
  gate output.
- Post-landing operator check: restart opencode inside the repo → `/`
  picker lists the momentum commands.
