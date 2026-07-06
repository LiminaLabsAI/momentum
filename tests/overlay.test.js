'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  listFilesRecursive,
  detectOverlayConflicts,
} = require('../bin/momentum.js');
const { mktmp, rmrf, write, runCli, REPO_ROOT } = require('./_helpers');

test('listFilesRecursive — returns relative paths for nested files', () => {
  const tmp = mktmp();
  try {
    write(path.join(tmp, 'a.md'), 'a');
    write(path.join(tmp, 'sub', 'b.md'), 'b');
    write(path.join(tmp, 'sub', 'deep', 'c.md'), 'c');
    const files = listFilesRecursive(tmp).sort();
    assert.deepEqual(files, [
      'a.md',
      path.join('sub', 'b.md'),
      path.join('sub', 'deep', 'c.md'),
    ]);
  } finally { rmrf(tmp); }
});

test('listFilesRecursive — empty array for missing dir', () => {
  assert.deepEqual(listFilesRecursive('/nonexistent/path/here'), []);
});

test('detectOverlayConflicts — returns empty when no overlap', () => {
  const tmp = mktmp();
  try {
    const core = path.join(tmp, 'core');
    const adapter = path.join(tmp, 'adapter');
    write(path.join(core, 'commands', 'a.md'), 'a');
    write(path.join(adapter, 'commands', 'b.md'), 'b');
    const conflicts = detectOverlayConflicts(core, adapter, ['commands']);
    assert.deepEqual(conflicts, []);
  } finally { rmrf(tmp); }
});

test('detectOverlayConflicts — flags duplicate filenames per subdir', () => {
  const tmp = mktmp();
  try {
    const core = path.join(tmp, 'core');
    const adapter = path.join(tmp, 'adapter');
    write(path.join(core, 'commands', 'shared.md'), 'core');
    write(path.join(adapter, 'commands', 'shared.md'), 'adapter');
    write(path.join(core, 'scripts', 'unique.sh'), 'x');
    const conflicts = detectOverlayConflicts(
      core, adapter, ['commands', 'scripts']
    );
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].subdir, 'commands');
    assert.equal(conflicts[0].file, 'shared.md');
  } finally { rmrf(tmp); }
});

test('CLI install — exits non-zero with conflict listed BEFORE writes', () => {
  // Place a duplicate filename in adapters/claude-code/commands/ to trigger
  // the conflict path. Cleanup after.
  const conflictFile = path.join(
    REPO_ROOT, 'adapters', 'claude-code', 'commands', 'log.md'
  );
  fs.copyFileSync(
    path.join(REPO_ROOT, 'core', 'commands', 'log.md'),
    conflictFile
  );

  const target = mktmp();
  try {
    const res = runCli(['init', target]);
    assert.notEqual(res.status, 0, 'CLI should exit non-zero on conflict');
    assert.match(res.stderr, /duplicate overlay files/);
    assert.match(res.stderr, /commands\/log\.md/);
    // BEFORE writes: target should be empty (no .claude/, no specs/, etc.)
    const entries = fs.readdirSync(target);
    assert.deepEqual(
      entries, [],
      `target should be empty on conflict abort, got: ${entries.join(', ')}`
    );
  } finally {
    fs.unlinkSync(conflictFile);
    rmrf(target);
  }
});

test('CLI install — adapter overlay file lands in target', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target]);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    // /review-code is shipped via adapters/claude-code/commands/ overlay
    const reviewCode = path.join(target, '.claude', 'commands', 'review-code.md');
    assert.equal(fs.existsSync(reviewCode), true,
      'expected /review-code from overlay');
    const content = fs.readFileSync(reviewCode, 'utf8');
    assert.match(content, /Claude-Code-specific/);
  } finally { rmrf(target); }
});
