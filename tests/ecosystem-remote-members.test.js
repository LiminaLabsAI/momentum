'use strict';

/**
 * Phase 30e G1 — Remote-URL members (ADR-0015).
 *
 * A member may be co-located (`path`), remote-only (`remote` git URL), or both.
 * This lets a distributed team share one ecosystem without identical folder
 * layouts. Validation requires at least one of path/remote; `ecosystem status`
 * resolves remote-identified members by URL (reachability via a local bare repo,
 * so the two-clone case runs fully offline). Relative paths stay unaffected.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');
const lib = require('../core/ecosystem/lib');

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.trim();
}

// ─── validateManifest: path / remote / both / neither ───────────────────────

test('validateManifest accepts a remote-only member', () => {
  const m = {
    name: 'demo', version: 1,
    members: [{ id: 'svc', remote: 'https://example.com/svc.git', role: 'platform' }],
  };
  assert.deepEqual(lib.validateManifest(m), { ok: true });
});

test('validateManifest accepts a member with both path and remote', () => {
  const m = {
    name: 'demo', version: 1,
    members: [{ id: 'svc', path: '../svc', remote: 'git@host:svc.git', role: 'client' }],
  };
  assert.deepEqual(lib.validateManifest(m), { ok: true });
});

test('validateManifest rejects a member with neither path nor remote', () => {
  const m = { name: 'demo', version: 1, members: [{ id: 'svc', role: 'platform' }] };
  const r = lib.validateManifest(m);
  assert.equal(r.ok, false);
  assert.ok(r.errors.find((e) => /at least one of `path` or `remote`/.test(e.message)),
    'expected the path-or-remote error');
});

test('validateManifest still accepts a plain path-only member (back-compat)', () => {
  const m = { name: 'demo', version: 1, members: [{ id: 'a', path: '../a', role: 'library' }] };
  assert.deepEqual(lib.validateManifest(m), { ok: true });
});

test('validateManifest rejects an empty-string remote', () => {
  const m = { name: 'demo', version: 1, members: [{ id: 'a', path: '../a', remote: '', role: 'library' }] };
  const r = lib.validateManifest(m);
  assert.equal(r.ok, false);
  assert.ok(r.errors.find((e) => e.path === '$.members[0].remote'));
});

// ─── resolveMemberLocation ──────────────────────────────────────────────────

test('resolveMemberLocation classifies local / remote / both', () => {
  const root = mktmp();
  try {
    fs.mkdirSync(path.join(root, 'here'));
    const local = lib.resolveMemberLocation(root, { id: 'a', path: 'here', role: 'library' });
    assert.equal(local.kind, 'local');
    assert.equal(local.hasLocal, true);
    assert.equal(local.remote, null);

    const remote = lib.resolveMemberLocation(root, { id: 'b', remote: 'https://x/b.git', role: 'client' });
    assert.equal(remote.kind, 'remote');
    assert.equal(remote.hasLocal, false);
    assert.equal(remote.localPath, null);
    assert.equal(remote.remote, 'https://x/b.git');

    const both = lib.resolveMemberLocation(root, { id: 'c', path: 'here', remote: 'https://x/c.git', role: 'infra' });
    assert.equal(both.kind, 'local+remote');
    assert.equal(both.hasLocal, true);
    assert.equal(both.remote, 'https://x/c.git');

    const missing = lib.resolveMemberLocation(root, { id: 'd', path: 'gone', role: 'other' });
    assert.equal(missing.kind, 'local');
    assert.equal(missing.hasLocal, false);
  } finally {
    rmrf(root);
  }
});

// ─── ecosystem status resolves a remote-URL member (offline, via bare repo) ──

test('ecosystem status resolves a remote-URL member and leaves relative paths intact', () => {
  const tmp = mktmp();
  try {
    // A real bare repo stands in for a teammate's remote — file:// resolves
    // with `git ls-remote` fully offline (this is the two-clone case in the small).
    const bare = path.join(tmp, 'svc.git');
    git(tmp, ['init', '--bare', bare]);
    // Seed one commit so HEAD resolves.
    const seed = path.join(tmp, 'seed');
    fs.mkdirSync(seed);
    git(seed, ['init']);
    git(seed, ['config', 'user.email', 't@t']);
    git(seed, ['config', 'user.name', 't']);
    fs.writeFileSync(path.join(seed, 'f'), 'x');
    git(seed, ['add', '.']);
    git(seed, ['commit', '-m', 'seed']);
    git(seed, ['branch', '-M', 'main']);
    git(seed, ['push', `file://${bare}`, 'main']);

    // A co-located member (relative path) that must keep working.
    const local = path.join(tmp, 'app');
    fs.mkdirSync(local);
    fs.writeFileSync(path.join(local, 'CLAUDE.md'), '# app');
    git(local, ['init']);
    git(local, ['config', 'user.email', 't@t']);
    git(local, ['config', 'user.name', 't']);
    git(local, ['add', '.']);
    git(local, ['commit', '-m', 'init']);

    const eco = path.join(tmp, 'eco');
    fs.mkdirSync(eco);
    fs.writeFileSync(path.join(eco, 'ecosystem.json'), JSON.stringify({
      name: 'demo', version: 1, created: '2026-07-10',
      members: [
        { id: 'app', path: '../app', role: 'client' },
        { id: 'svc', remote: `file://${bare}`, role: 'platform' },
      ],
    }, null, 2));

    const r = runCli(['ecosystem', 'status', '--ecosystem', eco]);
    assert.equal(r.status, 0, r.stderr);
    // Co-located member still shows its relative path + git state.
    assert.match(r.stdout, /app\s+\[client\]\s+\.\.\/app/);
    assert.match(r.stdout, /git: clean/);
    // Remote-URL member resolves by URL and is reachable.
    assert.match(r.stdout, /svc\s+\[platform\]\s+remote: file:\/\//);
    assert.match(r.stdout, /remote: reachable/);
  } finally {
    rmrf(tmp);
  }
});

// ─── ecosystem add --remote registers a remote-only member ───────────────────

test('ecosystem add --remote registers a remote-only member (no pointer)', () => {
  const tmp = mktmp();
  try {
    const eco = path.join(tmp, 'eco');
    fs.mkdirSync(eco);
    fs.writeFileSync(path.join(eco, 'ecosystem.json'), JSON.stringify({
      name: 'demo', version: 1, members: [],
    }, null, 2));

    const add = runCli(['ecosystem', 'add', '--remote', 'https://example.com/svc.git',
      '--id', 'svc', '--role', 'platform', '--ecosystem', eco]);
    assert.equal(add.status, 0, add.stderr);
    assert.match(add.stdout, /Added remote member "svc"/);

    const manifest = JSON.parse(fs.readFileSync(path.join(eco, 'ecosystem.json'), 'utf8'));
    assert.equal(manifest.members.length, 1);
    assert.deepEqual(manifest.members[0], { id: 'svc', remote: 'https://example.com/svc.git', role: 'platform' });
    assert.equal(manifest.members[0].path, undefined);

    // remove tolerates a member with no local path.
    const rm = runCli(['ecosystem', 'remove', 'svc', '--ecosystem', eco]);
    assert.equal(rm.status, 0, rm.stderr);
    const after = JSON.parse(fs.readFileSync(path.join(eco, 'ecosystem.json'), 'utf8'));
    assert.equal(after.members.length, 0);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem add --remote requires --id', () => {
  const tmp = mktmp();
  try {
    const eco = path.join(tmp, 'eco');
    fs.mkdirSync(eco);
    fs.writeFileSync(path.join(eco, 'ecosystem.json'), JSON.stringify({ name: 'demo', version: 1, members: [] }, null, 2));
    const r = runCli(['ecosystem', 'add', '--remote', 'https://x/y.git', '--ecosystem', eco]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--remote requires --id/);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem status marks an unreachable remote member', () => {
  const tmp = mktmp();
  try {
    const eco = path.join(tmp, 'eco');
    fs.mkdirSync(eco);
    fs.writeFileSync(path.join(eco, 'ecosystem.json'), JSON.stringify({
      name: 'demo', version: 1,
      members: [{ id: 'ghost', remote: `file://${path.join(tmp, 'does-not-exist.git')}`, role: 'platform' }],
    }, null, 2));
    const r = runCli(['ecosystem', 'status', '--ecosystem', eco]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /ghost\s+\[platform\]\s+remote: file:\/\//);
    assert.match(r.stdout, /remote: unreachable/);
  } finally {
    rmrf(tmp);
  }
});
