'use strict';

/**
 * ENH-021 — `momentum ecosystem add/remove/status` location-agnostic.
 *
 * Today (post-Group 0): all three subcommands resolve the ecosystem
 * root via:
 *   1. explicit `--ecosystem <path>` (highest precedence)
 *   2. ecosystem.json in CWD
 *   3. walk-up via findRoot()
 *   4. error with remediation
 *
 * This test exercises invocation from sibling, child, and unrelated
 * directories.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');
const {
  mkStandaloneRepo,
  mkEcosystemRoot,
} = require('./helpers/ecosystem-fixtures');

const lib = require('../core/ecosystem/lib');

test('ecosystem status — runs from inside ecosystem root (baseline)', () => {
  const tmp = mktmp();
  try {
    const root = mkEcosystemRoot(path.join(tmp, 'demo'), 'demo');
    lib._clearRootCache();
    const r = runCli(['ecosystem', 'status'], { cwd: root });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /Ecosystem: demo/);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem status — runs from a child directory inside ecosystem root (walk-up)', () => {
  const tmp = mktmp();
  try {
    const root = mkEcosystemRoot(path.join(tmp, 'demo'), 'demo');
    const child = path.join(root, 'initiatives'); // already exists
    lib._clearRootCache();
    const r = runCli(['ecosystem', 'status'], { cwd: child });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /Ecosystem: demo/);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem status — runs from an unrelated directory with --ecosystem <path>', () => {
  const tmp = mktmp();
  try {
    const root = mkEcosystemRoot(path.join(tmp, 'demo'), 'demo');
    const unrelated = path.join(tmp, 'unrelated');
    fs.mkdirSync(unrelated, { recursive: true });
    lib._clearRootCache();
    const r = runCli(['ecosystem', 'status', '--ecosystem', root], { cwd: unrelated });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /Ecosystem: demo/);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem status — invalid --ecosystem path errors usefully', () => {
  const tmp = mktmp();
  try {
    const unrelated = path.join(tmp, 'unrelated');
    fs.mkdirSync(unrelated, { recursive: true });
    lib._clearRootCache();
    const r = runCli(['ecosystem', 'status', '--ecosystem', '/non/existent/path'], {
      cwd: unrelated,
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /no ecosystem\.json/i);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem add — works from a member-repo sibling directory via --ecosystem', () => {
  const tmp = mktmp();
  try {
    const root = mkEcosystemRoot(path.join(tmp, 'demo'), 'demo');
    const memberDir = mkStandaloneRepo(path.join(tmp, 'project-a'));
    lib._clearRootCache();
    const r = runCli(
      ['ecosystem', 'add', memberDir, '--ecosystem', root, '--role', 'platform'],
      { cwd: tmp },
    );
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);

    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, 'ecosystem.json'), 'utf8'),
    );
    assert.equal(manifest.members.length, 1);
    assert.equal(manifest.members[0].id, 'project-a');
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem remove — works via --ecosystem override', () => {
  const tmp = mktmp();
  try {
    const memberDir = mkStandaloneRepo(path.join(tmp, 'project-b'));
    const root = mkEcosystemRoot(path.join(tmp, 'demo'), 'demo', [
      { id: 'project-b', path: '../project-b', role: 'platform' },
    ]);
    // Inject pointer so remove has something to strip.
    const { ensurePointerInjected } = require('../core/ecosystem/lib/pointer');
    ensurePointerInjected(memberDir, 'CLAUDE.md', root, 'demo');
    lib._clearRootCache();

    const unrelated = path.join(tmp, 'somewhere-else');
    fs.mkdirSync(unrelated, { recursive: true });
    const r = runCli(
      ['ecosystem', 'remove', 'project-b', '--ecosystem', root],
      { cwd: unrelated },
    );
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);

    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, 'ecosystem.json'), 'utf8'),
    );
    assert.equal(manifest.members.length, 0);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem status — no ecosystem reachable produces a remediation error', () => {
  const tmp = mktmp();
  try {
    const isolated = path.join(tmp, 'alone');
    fs.mkdirSync(isolated, { recursive: true });
    lib._clearRootCache();
    const r = runCli(['ecosystem', 'status'], { cwd: isolated });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /no ecosystem\.json found/i);
    assert.match(r.stderr, /--ecosystem/);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem status — from inside a member, sibling-walk finds ecosystem root (ENH-021)', () => {
  const tmp = mktmp();
  try {
    const { mkMemberRepo } = require('./helpers/ecosystem-fixtures');
    const memberDir = mkMemberRepo(path.join(tmp, 'member-a'), 'demo');
    mkEcosystemRoot(path.join(tmp, 'demo'), 'demo', [
      { id: 'member-a', path: '../member-a', role: 'platform' },
    ]);
    lib._clearRootCache();
    // From inside the member repo (no --ecosystem flag, no parent has
    // ecosystem.json), CLI must walk siblings to find the ecosystem root.
    const r = runCli(['ecosystem', 'status'], { cwd: memberDir });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /Ecosystem: demo/);
  } finally {
    rmrf(tmp);
  }
});
