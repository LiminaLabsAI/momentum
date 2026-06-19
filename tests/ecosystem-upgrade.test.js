'use strict';

// Phase 20 — Upgrade Hardening, Group 3.
// `momentum ecosystem upgrade` — PULL-model fleet sweep. Verifies the
// fleet-safety contract: clean-tree gate (skip dirty unless --force), missing
// member reported + sweep continues, per-repo version report, and --dry-run
// writes nothing.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const crypto = require('node:crypto');

const { mktmp, rmrf, runCli } = require('./_helpers');

function makeEco() {
  const tmp = mktmp();
  const init = runCli(['ecosystem', 'init', 'eco'], { cwd: tmp });
  assert.equal(init.status, 0, `ecosystem init failed: ${init.stderr}`);
  return { tmp, root: path.join(tmp, 'eco') };
}

// Install momentum into a sibling repo and register it as a member.
function addMember(tmp, root, name, { git = false, dirty = false } = {}) {
  const dir = path.join(tmp, name);
  const res = runCli(['init', dir, '--agent', 'claude-code']);
  assert.equal(res.status, 0, `member init failed: ${res.stderr}`);
  if (git) {
    execSync('git init -q && git add -A && git -c user.email=t@e -c user.name=t commit -q -m init', { cwd: dir });
    if (dirty) fs.writeFileSync(path.join(dir, 'uncommitted.txt'), 'wip\n');
  }
  const add = runCli(['ecosystem', 'add', `../${name}`, '--role', 'library', '--id', name], { cwd: root });
  assert.equal(add.status, 0, `ecosystem add failed: ${add.stderr}`);
  return dir;
}

function snapshot(dir) {
  const files = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('._') || e.name === '.git') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else files[path.relative(dir, p)] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    }
  };
  walk(dir);
  return files;
}

test('ecosystem upgrade — sweeps all clean members and reports per-repo', () => {
  const { tmp, root } = makeEco();
  try {
    const a = addMember(tmp, root, 'repo-a');
    addMember(tmp, root, 'repo-b');

    const res = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.equal(res.status, 0, `sweep failed: ${res.stderr}`);
    assert.match(res.stdout, /repo-a/);
    assert.match(res.stdout, /repo-b/);
    assert.match(res.stdout, /Sweep summary/);
    assert.match(res.stdout, /2 upgraded/);
    // Lock files present + at the current CLI version.
    assert.ok(fs.existsSync(path.join(a, '.momentum', 'installed.json')));
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem upgrade — skips a dirty member, --force upgrades it', () => {
  const { tmp, root } = makeEco();
  try {
    addMember(tmp, root, 'repo-dirty', { git: true, dirty: true });

    const skip = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.equal(skip.status, 0, skip.stderr);
    assert.match(skip.stdout, /not clean — skipped/);
    assert.match(skip.stdout, /1 dirty-skip/);

    const forced = runCli(['ecosystem', 'upgrade', '--force'], { cwd: root });
    assert.equal(forced.status, 0, forced.stderr);
    assert.match(forced.stdout, /1 upgraded/);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem upgrade --dry-run — writes nothing to any member', () => {
  const { tmp, root } = makeEco();
  try {
    const a = addMember(tmp, root, 'repo-a');
    const before = snapshot(a);

    const res = runCli(['ecosystem', 'upgrade', '--dry-run'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /dry run/i);
    assert.match(res.stdout, /no files were written/i);

    assert.deepEqual(snapshot(a), before, 'dry-run sweep must not change any member file');
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem upgrade — reports a missing member and continues the sweep', () => {
  const { tmp, root } = makeEco();
  try {
    const gone = addMember(tmp, root, 'repo-gone');
    addMember(tmp, root, 'repo-live');
    rmrf(gone); // registered but no longer on disk

    const res = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /missing on disk/);
    assert.match(res.stdout, /1 missing/);
    assert.match(res.stdout, /1 upgraded/); // the live member still ran
  } finally {
    rmrf(tmp);
  }
});
