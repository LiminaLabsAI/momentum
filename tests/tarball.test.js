'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const { REPO_ROOT } = require('./_helpers');

test('npm tarball shape — includes required runtime adapter files and no repo artifacts', () => {
  const res = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 20000,
  });
  assert.equal(res.status, 0, `npm pack failed:\nSTDOUT:\n${res.stdout}\nSTDERR:\n${res.stderr}`);

  const pack = JSON.parse(res.stdout)[0];
  const files = new Set(pack.files.map((file) => file.path));

  for (const required of [
    'bin/momentum.js',
    'core/commands/brainstorm-phase.md',
    'core/agent-rules/project.md',
    'core/scripts/check-history-reminder.sh',
    'core/specs-templates/README.md',
    'core/specs-templates/specs/status.md',
    'adapters/claude-code/adapter.js',
    'adapters/claude-code/settings.json',
    'adapters/claude-code/commands/review-code.md',
    // Phase 16 Rework: brainstorm-gate.sh moved to core/scripts/ (shared
    // across Claude Code + Codex + Antigravity). Same post-install path.
    'core/scripts/brainstorm-gate.sh',
    'adapters/codex/adapter.js',
    'adapters/codex/hooks.json',
    'adapters/codex/instructions/AGENTS.md',
    'adapters/antigravity/adapter.js',
    'adapters/antigravity/instructions/AGENTS.md',
    'core/engines/subagent-dispatch.md',
    // Phase 11 — orchestration library
    'core/orchestration/index.js',
    'core/orchestration/events.js',
    'core/orchestration/types.js',
    'core/orchestration/capability-routing.js',
    'core/orchestration/session-log.js',
    'core/orchestration/run-artifact.js',
    'core/orchestration/scout.js',
    'core/orchestration/dispatch.js',
    'core/orchestration/handoff.js',
    'core/orchestration/continue.js',
    'core/orchestration/tracking.js',
    // Phase 11 — SessionStart hook script (shipped to every install)
    'core/scripts/sessionstart-handoff.sh',
    // Phase 11 — orchestration CLI
    'bin/orchestration-commands.js',
    // Phase 11 — adapter slash commands
    'adapters/claude-code/commands/scout.md',
    'adapters/claude-code/commands/dispatch.md',
    'adapters/claude-code/commands/handoff.md',
    'adapters/claude-code/commands/continue.md',
    'adapters/codex/commands/scout.md',
    'adapters/codex/commands/dispatch.md',
    'adapters/codex/commands/handoff.md',
    'adapters/codex/commands/continue.md',
    // Phase 16 Rework — Codex native subagents + orient skill
    'adapters/codex/agents/momentum-reviewer-security.toml',
    'adapters/codex/agents/momentum-reviewer-qa.toml',
    'adapters/codex/agents/momentum-reviewer-architecture.toml',
    'adapters/codex/skills/momentum-orient/SKILL.md',
    // Phase 16 Rework — Antigravity workflows + skills + hooks
    'adapters/antigravity/hooks.json',
    'adapters/antigravity/workflows/scout.md',
    'adapters/antigravity/workflows/dispatch.md',
    'adapters/antigravity/workflows/handoff.md',
    'adapters/antigravity/workflows/continue.md',
    'adapters/antigravity/workflows/review-code.md',
    'adapters/antigravity/skills/momentum-orient/SKILL.md',
    'adapters/antigravity/skills/momentum-reviewer-security/SKILL.md',
    'adapters/antigravity/skills/momentum-reviewer-qa/SKILL.md',
    'adapters/antigravity/skills/momentum-reviewer-architecture/SKILL.md',
    // Phase 15 — ecosystem CLAUDE.md / AGENTS.md templates (ENH-025)
    'core/ecosystem/templates/ecosystem-claude.md',
    'core/ecosystem/templates/ecosystem-agents.md',
    'core/ecosystem/templates/initiative-template.md',
    'package.json',
    'README.md',
    'LICENSE',
  ]) {
    assert.equal(files.has(required), true, `missing required tarball path: ${required}`);
  }

  for (const file of files) {
    assert.equal(file.includes('/._'), false, `AppleDouble path leaked: ${file}`);
    assert.equal(file.startsWith('._'), false, `AppleDouble path leaked: ${file}`);
    assert.equal(file.startsWith('specs/'), false, `repo specs leaked: ${file}`);
    assert.equal(file.startsWith('tests/'), false, `tests leaked: ${file}`);
    assert.equal(file.startsWith('.claude/'), false, `.claude leaked: ${file}`);
    assert.equal(file.startsWith('.codex/'), false, `.codex leaked: ${file}`);
    assert.equal(file.startsWith('.momentum/'), false, `.momentum leaked: ${file}`);
    assert.equal(file.includes('.bak'), false, `backup file leaked: ${file}`);
  }
});
