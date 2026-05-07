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

    // CLAUDE.md + agent rules
    assert.equal(fs.existsSync(path.join(target, 'CLAUDE.md')), true);
    assert.equal(
      fs.existsSync(path.join(target, '.agent', 'rules', 'project.md')),
      true
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

test('init — skip-if-exists preserves user content in agent-rules/project.md', () => {
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
      'init should not overwrite existing agent-rules/project.md'
    );
    assert.match(res.stdout, /already exists/);
  } finally { rmrf(target); }
});

test('init — unknown agent exits non-zero', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'nonexistent-agent']);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /Unknown agent/);
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
