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
    'adapters/claude-code/scripts/brainstorm-gate.sh',
    'adapters/codex/adapter.js',
    'adapters/codex/hooks.json',
    'adapters/codex/instructions/AGENTS.md',
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
