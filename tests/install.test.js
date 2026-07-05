'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, write, read } = require('./_helpers');

test('init — fresh install produces all expected files', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target]);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);

    // Core commands
    const cmdDir = path.join(target, '.claude', 'commands');
    assert.equal(fs.existsSync(cmdDir), true);
    const cmds = fs.readdirSync(cmdDir);
    for (const expected of [
      'brainstorm-idea.md', 'brainstorm-phase.md', 'start-phase.md',
      'complete-phase.md', 'sync-docs.md', 'log.md', 'track.md',
      'validate.md', 'migrate.md', 'review.md', 'start-project.md',
    ]) {
      assert.ok(cmds.includes(expected), `missing core command: ${expected}`);
    }

    // Hook script + executable bit
    const hook = path.join(target, 'scripts', 'check-history-reminder.sh');
    assert.equal(fs.existsSync(hook), true);
    const mode = fs.statSync(hook).mode & 0o777;
    assert.ok((mode & 0o111) !== 0, `hook script not executable: ${mode.toString(8)}`);

    // CLAUDE.md ships; .agent/rules/project.md is retired (Phase 23 / ADR-0004)
    assert.equal(fs.existsSync(path.join(target, 'CLAUDE.md')), true);
    assert.equal(
      fs.existsSync(path.join(target, '.agent', 'rules', 'project.md')),
      false,
      'retired agent-rules file must not be installed'
    );

    // specs/ skeleton
    assert.equal(fs.existsSync(path.join(target, 'specs')), true);
    assert.equal(
      fs.existsSync(path.join(target, 'specs', 'status.md')), true
    );

    // Claude Code adapter — settings.json
    assert.equal(
      fs.existsSync(path.join(target, '.claude', 'settings.json')), true
    );
  } finally { rmrf(target); }
});

test('init — claude-code output shape remains Claude-specific', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'claude-code']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    assert.equal(fs.existsSync(path.join(target, 'CLAUDE.md')), true);
    assert.equal(fs.existsSync(path.join(target, 'AGENTS.md')), false);
    assert.equal(fs.existsSync(path.join(target, '.claude', 'settings.json')), true);
    assert.equal(fs.existsSync(path.join(target, '.claude', 'commands', 'review-code.md')), true);
    assert.equal(fs.existsSync(path.join(target, '.codex')), false);
  } finally { rmrf(target); }
});

test('init — codex install produces AGENTS.md, hooks, and recipe skills', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);

    assert.equal(fs.existsSync(path.join(target, 'AGENTS.md')), true);
    assert.equal(fs.existsSync(path.join(target, 'CLAUDE.md')), false);
    assert.equal(fs.existsSync(path.join(target, '.codex', 'hooks.json')), true);
    // ENH-036: recipes ship as native Codex skills, not .codex/commands/ fragments.
    assert.equal(
      fs.existsSync(path.join(target, '.agents', 'skills', 'brainstorm-phase', 'SKILL.md')),
      true,
    );
    assert.equal(
      fs.existsSync(path.join(target, '.agents', 'skills', 'start-phase', 'SKILL.md')),
      true,
    );
    assert.equal(fs.existsSync(path.join(target, '.codex', 'commands')), false,
      'legacy .codex/commands/ should be removed after the skill transform');
    assert.equal(fs.existsSync(path.join(target, '.agent', 'rules', 'project.md')), false, 'retired (Phase 23)');
    assert.equal(fs.existsSync(path.join(target, 'scripts', 'check-history-reminder.sh')), true);
    assert.equal(fs.existsSync(path.join(target, 'specs', 'status.md')), true);
    assert.equal(fs.existsSync(path.join(target, '.claude')), false);

    const agentsMd = read(path.join(target, 'AGENTS.md'));
    // ENH-036: section renamed from "Momentum Recipes — Lookup Pattern" to skills framing.
    assert.match(agentsMd, /Momentum Recipes — Codex Skills/);
    assert.match(agentsMd, /## Project Extensions/);

    const leaked = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('._')) leaked.push(path.join(dir, entry.name));
        if (entry.isDirectory()) walk(path.join(dir, entry.name));
      }
    };
    walk(target);
    assert.deepEqual(leaked, [], `AppleDouble files leaked: ${leaked.join(', ')}`);
  } finally { rmrf(target); }
});

test('init — antigravity install produces AGENTS.md and command recipes', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'antigravity']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);

    assert.equal(fs.existsSync(path.join(target, 'AGENTS.md')), true);
    assert.equal(fs.existsSync(path.join(target, 'CLAUDE.md')), false);
    assert.equal(fs.existsSync(path.join(target, '.agents', 'workflows', 'brainstorm-phase.md')), true);
    assert.equal(fs.existsSync(path.join(target, '.agents', 'workflows', 'start-phase.md')), true);
    assert.equal(fs.existsSync(path.join(target, '.antigravity')), false, '.antigravity/ should not be created — workflows live at .agents/workflows/ (ADR-0005)');
    assert.equal(fs.existsSync(path.join(target, '.agent', 'rules', 'project.md')), false, 'retired (Phase 23)');
    assert.equal(fs.existsSync(path.join(target, 'scripts', 'check-history-reminder.sh')), true);
    assert.equal(fs.existsSync(path.join(target, 'specs', 'status.md')), true);
    assert.equal(fs.existsSync(path.join(target, '.claude')), false);
    assert.equal(fs.existsSync(path.join(target, '.codex')), false);

    const agentsMd = read(path.join(target, 'AGENTS.md'));
    assert.match(agentsMd, /Antigravity Native Artifacts Integration/);
    assert.match(agentsMd, /## Project Extensions/);
  } finally { rmrf(target); }
});

test('init — CLAUDE.md ships all 12 rules', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target]);
    assert.equal(res.status, 0);
    const claudeMd = read(path.join(target, 'CLAUDE.md'));
    for (let n = 1; n <= 12; n++) {
      assert.match(claudeMd, new RegExp(`### Rule ${n}\\b`),
        `Rule ${n} missing from CLAUDE.md`);
    }
    assert.match(claudeMd, /## Project Extensions/);
  } finally { rmrf(target); }
});

test('init — leaves a pre-existing agent-rules/project.md untouched (retired surface)', () => {
  const target = mktmp();
  try {
    // Pre-create a custom project.md
    const custom = '# my custom rules\n';
    write(path.join(target, '.agent', 'rules', 'project.md'), custom);
    const res = runCli(['init', target]);
    assert.equal(res.status, 0);
    assert.equal(
      read(path.join(target, '.agent', 'rules', 'project.md')),
      custom,
      'init must not touch a user-owned project.md (retired surface — migration is upgrade-time)'
    );
  } finally { rmrf(target); }
});

test('init — unknown agent exits non-zero', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'nonexistent-agent']);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /Unknown agent/);
    assert.match(res.stderr, /antigravity, claude-code, codex/);
  } finally { rmrf(target); }
});

test('init — deprecated --coding-agent flag exits with rename hint', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--coding-agent', 'claude-code']);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /renamed to --agent/);
  } finally { rmrf(target); }
});
