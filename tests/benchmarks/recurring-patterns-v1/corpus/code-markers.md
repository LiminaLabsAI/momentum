# Code/test references to each candidate id, captured verbatim at v0.44.0.
#
# The stale-closure signal is a CONTRADICTION: a backlog row saying 'open'
# while the code carries a marker showing the work landed. Captured as real
# evidence rather than a description of it, so the detector is scored against
# what it will actually have to read.

## TD-009
scripts/capture-fingerprints.js:9: *   - tests/adapter-opencode-fingerprint.test.js   (TD-009)
scripts/capture-fingerprints.js:39:  { agent: 'opencode', fixture: 'v0.28.0-opencode-fingerprint.json' }, // TD-009

## TD-012
core/ecosystem/lib/cross-repo.js:20: * installed. TD-012 tracks consolidating this shipped-runtime story.
core/git-hooks/cross-repo.js:20: * installed. TD-012 tracks consolidating this shipped-runtime story.
tests/ecosystem-orient.test.js:319:  // TD-012), so its answer is pinned against the authority here.

## TD-013

## ENH-063
bin/lanes.js:210:  // ENH-063: close does FULL cleanup — local + remote branch (default-branch-
core/lanes/lib/cleanup.js:5: * (Phase 27 G0 — BUG-026 / ENH-063; see specs/phases/phase-27-lifecycle-cleanup).
tests/lane-cleanup.test.js:5: * (core/lanes/lib/cleanup.js). BUG-025 / BUG-026 / ENH-063.
tests/lanes-open-close.test.js:127:    assert.match(c.stdout, /worktree: .*feat-b/); // ENH-063: cleanup action output

## BUG-007
core/adapter-parity-matrix.md:133:10. **Codex hooks** — wired via `.codex/hooks.json` with matchers `apply_patch|Bash` for PreToolUse/PostToolUse and no matcher for SessionStart. Per Codex docs (https://developers.openai.com/codex/hooks) the canonical `tool_name` for shell commands is `Bash` — earlier `shell` matcher was a bug (BUG-007, fixed 2026-06-13). Hooks are **enabled by default** in current Codex CLI (`hooks` is `stable: true` in `codex features list`); the first run prompts users to trust each hook via `/hooks`. The legacy `[features] hooks = true` opt-in remains as a fallback.
core/ecosystem/lib/detect.js:16: * close (BUG-007/BUG-028, and the hook-side writer's parity fence).
tests/adapter-hook-execution-codex.test.js:11: * (BUG-007). Per Codex docs, canonical tool_name for shell commands is
tests/adapter-hook-execution-codex.test.js:75:test('codex PreToolUse: legacy "shell" tool_name does NOT fire (regression guard for BUG-007)', () => {

## BUG-027
tests/instruction-generation.test.js:74:// BUG-027 guard (Phase 29): a generated recipe row once shipped without its
tests/instruction-generation.test.js:78:test('every markdown table row in generated instruction files is well-formed (BUG-027 guard)', () => {
tests/project-rules-migration.test.js:6: * migrated (never dropped) into project-rules.md; idempotent. Plus a BUG-027
tests/project-rules-migration.test.js:109:test('BUG-027: adapter recipe-table sync-config rows are well-formed (trailing pipe)', () => {

## BUG-028
bin/team.js:55:    console.error('  e.g. momentum claim phase 30a  |  momentum claim version 0.37.0  |  momentum claim id BUG-028');
core/ecosystem/lib/detect.js:16: * close (BUG-007/BUG-028, and the hook-side writer's parity fence).
core/ecosystem/lib/events.js:14: *      adapter for its entire life (BUG-028). Two independent multi-repo
core/git-hooks/eco-event.js:12: * entire life (BUG-028); `$PWD`-based member resolution missed lane worktrees;

