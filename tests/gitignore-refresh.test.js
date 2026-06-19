'use strict';

// Phase 20 follow-up — `momentum upgrade` additively refreshes `.gitignore`.
// Root cause from the cerebrio fleet: upgrade left an old `.gitignore` untouched,
// so repos predating the `._*` / `.momentum/*` rules stayed polluted (fatal on
// exFAT). Fix: append any missing momentum/OS rules, never removing user lines.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, read, write } = require('./_helpers');

const MOMENTUM_RULES = ['._*', '.DS_Store', '.momentum/*', '!.momentum/installed.json', '.claude/worktrees/'];

test('upgrade — appends missing momentum/OS rules to an old .gitignore (with .bak)', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    write(path.join(target, '.gitignore'), 'node_modules/\n*.log\n'); // stale, pre-Phase-20

    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /\.gitignore:\s+updated/);

    const gi = read(path.join(target, '.gitignore'));
    for (const rule of MOMENTUM_RULES) {
      assert.ok(gi.split('\n').map((l) => l.trim()).includes(rule), `missing rule: ${rule}`);
    }
    assert.match(gi, /node_modules\//, 'user line preserved');
    assert.match(gi, /\*\.log/, 'user line preserved');
    assert.ok(fs.existsSync(path.join(target, '.gitignore.bak')), '.bak saved');
  } finally {
    rmrf(target);
  }
});

test('upgrade — .gitignore refresh is idempotent (re-run appends nothing)', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    write(path.join(target, '.gitignore'), 'node_modules/\n');
    runCli(['upgrade', target]);
    const after1 = read(path.join(target, '.gitignore'));

    const res = runCli(['upgrade', target]);
    assert.match(res.stdout, /\.gitignore:\s+unchanged/);
    assert.equal(read(path.join(target, '.gitignore')), after1, 'no further changes on re-run');
  } finally {
    rmrf(target);
  }
});

test('upgrade — .gitignore is never recorded as a managed file (not orphan-eligible)', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    write(path.join(target, '.gitignore'), 'node_modules/\n');
    runCli(['upgrade', target]);
    const m = JSON.parse(read(path.join(target, '.momentum', 'installed.json')));
    assert.ok(!m.managedFiles.some((f) => f.path === '.gitignore'), '.gitignore must not be managed');
  } finally {
    rmrf(target);
  }
});

test('upgrade --dry-run — does not modify .gitignore', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    write(path.join(target, '.gitignore'), 'node_modules/\n');
    const before = read(path.join(target, '.gitignore'));

    const res = runCli(['upgrade', target, '--dry-run']);
    assert.match(res.stdout, /would append .* \.gitignore|\.gitignore/);
    assert.equal(read(path.join(target, '.gitignore')), before, 'dry-run must not write');
    assert.ok(!fs.existsSync(path.join(target, '.gitignore.bak')), 'dry-run makes no .bak');
  } finally {
    rmrf(target);
  }
});
