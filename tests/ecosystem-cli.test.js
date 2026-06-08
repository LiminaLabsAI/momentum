'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, write, read } = require('./_helpers');

const lib = require('../core/ecosystem/lib');
const eco = require('../bin/ecosystem');

// ─────────────────────────────────────────────────────────────────────────────
// validateManifest
// ─────────────────────────────────────────────────────────────────────────────

test('validateManifest accepts a minimal valid manifest', () => {
  const m = { name: 'demo', version: 1, members: [] };
  assert.deepEqual(lib.validateManifest(m), { ok: true });
});

test('validateManifest accepts members + dependencies', () => {
  const m = {
    name: 'cerebrio',
    version: 1,
    created: '2026-06-07',
    members: [
      { id: 'a', path: '../a', role: 'platform' },
      { id: 'b', path: '../b', role: 'client', consumes: ['a.openapi'] },
    ],
    dependencies: [{ from: 'b', to: 'a', kind: 'api-contract' }],
  };
  assert.deepEqual(lib.validateManifest(m), { ok: true });
});

test('validateManifest reports every error (does not bail on first)', () => {
  const bad = {
    name: 'Bad-Name', // bad slug pattern
    version: 2, // wrong version
    members: [
      { id: 'x', path: 'p', role: 'unknown' }, // bad role
      { id: 'x', path: 'p2', role: 'platform' }, // duplicate id
    ],
    dependencies: [{ from: 'x', to: 'ghost', kind: 'mystery' }],
  };
  const r = lib.validateManifest(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.length >= 4, `expected ≥4 errors, got ${r.errors.length}`);
  assert.ok(r.errors.find((e) => e.path === '$.name'), 'name error');
  assert.ok(r.errors.find((e) => e.path === '$.version'), 'version error');
});

test('validateManifest catches non-object input', () => {
  const r = lib.validateManifest('not an object');
  assert.equal(r.ok, false);
  assert.equal(r.errors[0].path, '$');
});

// ─────────────────────────────────────────────────────────────────────────────
// findRoot bounded walk + memoization
// ─────────────────────────────────────────────────────────────────────────────

test('findRoot locates ecosystem.json in current dir', () => {
  const root = mktmp();
  try {
    fs.writeFileSync(path.join(root, 'ecosystem.json'), '{}');
    lib._clearRootCache();
    // findRoot uses path.resolve (no symlink dereferencing) — compare in
    // the same form so macOS /var/ vs /private/var/ doesn't trip us.
    assert.equal(lib.findRoot(root), path.resolve(root));
  } finally {
    rmrf(root);
  }
});

test('findRoot walks up at most MAX_WALK_DEPTH parents', () => {
  const top = mktmp();
  try {
    // Create top/a/b/c/d/e/f — 6 levels deep, ecosystem.json at top.
    let cur = top;
    for (const seg of ['a', 'b', 'c', 'd', 'e', 'f']) {
      cur = path.join(cur, seg);
      fs.mkdirSync(cur);
    }
    fs.writeFileSync(path.join(top, 'ecosystem.json'), '{}');
    lib._clearRootCache();
    // From 6 levels deep we exceed MAX_WALK_DEPTH (5) — should NOT find.
    assert.equal(lib.findRoot(cur), null);
    // From 5 levels deep (parent of f) we should find.
    assert.equal(lib.findRoot(path.dirname(cur)), path.resolve(top));
  } finally {
    rmrf(top);
  }
});

test('findRoot returns null outside any ecosystem', () => {
  const tmp = mktmp();
  try {
    lib._clearRootCache();
    assert.equal(lib.findRoot(tmp), null);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CLI: ecosystem init / add / status / remove
// ─────────────────────────────────────────────────────────────────────────────

test('ecosystem init scaffolds expected layout in a named subdir', () => {
  const tmp = mktmp();
  try {
    const res = runCli(['ecosystem', 'init', 'demo'], { cwd: tmp });
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const root = path.join(tmp, 'demo');
    assert.ok(fs.existsSync(path.join(root, 'ecosystem.json')));
    assert.ok(fs.existsSync(path.join(root, 'README.md')));
    assert.ok(fs.existsSync(path.join(root, 'initiatives', 'README.md')));
    assert.ok(fs.existsSync(path.join(root, 'sessions')));
    assert.ok(fs.existsSync(path.join(root, '.state')));
    assert.ok(fs.existsSync(path.join(root, '.gitignore')));
    const manifest = JSON.parse(read(path.join(root, 'ecosystem.json')));
    assert.equal(manifest.name, 'demo');
    assert.equal(manifest.version, 1);
    assert.deepEqual(manifest.members, []);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem init refuses to overwrite an existing manifest', () => {
  const tmp = mktmp();
  try {
    // Pre-create the manifest under <tmp>/demo so an explicit name passes
    // slug validation, then expect the overwrite refusal.
    fs.mkdirSync(path.join(tmp, 'demo'));
    fs.writeFileSync(path.join(tmp, 'demo', 'ecosystem.json'), '{}');
    const res = runCli(['ecosystem', 'init', 'demo'], { cwd: tmp });
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /already exists/i);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem add registers a member and injects the pointer', () => {
  const tmp = mktmp();
  try {
    // Make ecosystem.
    runCli(['ecosystem', 'init', 'eco'], { cwd: tmp });
    const root = path.join(tmp, 'eco');
    // Make a fake momentum-installed member.
    const memberDir = path.join(tmp, 'member');
    fs.mkdirSync(path.join(memberDir, 'specs'), { recursive: true });
    write(path.join(memberDir, 'CLAUDE.md'), '# Member\n');
    write(path.join(memberDir, 'specs', 'status.md'), 'x\n');

    const res = runCli(
      ['ecosystem', 'add', '../member', '--role', 'platform', '--id', 'member'],
      { cwd: root },
    );
    assert.equal(res.status, 0, res.stderr || res.stdout);

    // Manifest mutated.
    const m = JSON.parse(read(path.join(root, 'ecosystem.json')));
    assert.equal(m.members.length, 1);
    assert.equal(m.members[0].id, 'member');
    assert.equal(m.members[0].role, 'platform');

    // Pointer injected (v2 form — substring match accepts both v1 and v2).
    const claude = read(path.join(memberDir, 'CLAUDE.md'));
    assert.match(claude, /<!-- ecosystem:begin/);
    assert.match(claude, /<!-- ecosystem:end -->/);
    assert.match(claude, /Member of `eco`/);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem add is idempotent on re-run', () => {
  const tmp = mktmp();
  try {
    runCli(['ecosystem', 'init', 'eco'], { cwd: tmp });
    const root = path.join(tmp, 'eco');
    const memberDir = path.join(tmp, 'member');
    fs.mkdirSync(path.join(memberDir, 'specs'), { recursive: true });
    write(path.join(memberDir, 'CLAUDE.md'), '# Member\n');
    write(path.join(memberDir, 'specs', 'status.md'), 'x\n');

    const a = runCli(
      ['ecosystem', 'add', '../member', '--role', 'platform', '--id', 'member'],
      { cwd: root },
    );
    assert.equal(a.status, 0);
    const claude1 = read(path.join(memberDir, 'CLAUDE.md'));

    const b = runCli(
      ['ecosystem', 'add', '../member', '--role', 'platform', '--id', 'member'],
      { cwd: root },
    );
    assert.equal(b.status, 0);
    assert.match(b.stdout, /No changes/i);
    const claude2 = read(path.join(memberDir, 'CLAUDE.md'));
    assert.equal(claude1, claude2, 'CLAUDE.md should be byte-identical after idempotent add');
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem add refuses non-momentum targets (pre-flight)', () => {
  const tmp = mktmp();
  try {
    runCli(['ecosystem', 'init', 'eco'], { cwd: tmp });
    const root = path.join(tmp, 'eco');
    const memberDir = path.join(tmp, 'not-momentum');
    fs.mkdirSync(memberDir); // no CLAUDE.md / AGENTS.md
    const res = runCli(
      ['ecosystem', 'add', '../not-momentum', '--role', 'other', '--id', 'foo'],
      { cwd: root },
    );
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /momentum-installed|CLAUDE\.md/i);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem remove strips manifest entry and pointer', () => {
  const tmp = mktmp();
  try {
    runCli(['ecosystem', 'init', 'eco'], { cwd: tmp });
    const root = path.join(tmp, 'eco');
    const memberDir = path.join(tmp, 'member');
    fs.mkdirSync(path.join(memberDir, 'specs'), { recursive: true });
    write(path.join(memberDir, 'CLAUDE.md'), '# Member\n');
    write(path.join(memberDir, 'specs', 'status.md'), 'x\n');

    runCli(
      ['ecosystem', 'add', '../member', '--role', 'platform', '--id', 'member'],
      { cwd: root },
    );
    const res = runCli(['ecosystem', 'remove', 'member'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);

    const m = JSON.parse(read(path.join(root, 'ecosystem.json')));
    assert.equal(m.members.length, 0);

    const claude = read(path.join(memberDir, 'CLAUDE.md'));
    assert.doesNotMatch(claude, /ecosystem:begin/);
    assert.doesNotMatch(claude, /ecosystem:end/);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem status prints members + active initiative banner', () => {
  const tmp = mktmp();
  try {
    runCli(['ecosystem', 'init', 'eco'], { cwd: tmp });
    const root = path.join(tmp, 'eco');
    // No members yet → friendly message.
    const r0 = runCli(['ecosystem', 'status'], { cwd: root });
    assert.equal(r0.status, 0);
    assert.match(r0.stdout, /none registered yet/);

    // Add a member + set an active initiative.
    const memberDir = path.join(tmp, 'm1');
    fs.mkdirSync(path.join(memberDir, 'specs'), { recursive: true });
    write(path.join(memberDir, 'CLAUDE.md'), '# m1\n');
    write(path.join(memberDir, 'specs', 'status.md'), 'x\n');
    runCli(
      ['ecosystem', 'add', '../m1', '--role', 'platform', '--id', 'm1'],
      { cwd: root },
    );
    write(path.join(root, '.state', 'active-initiative'), 'memory-module');

    const r1 = runCli(['ecosystem', 'status', '--no-git'], { cwd: root });
    assert.equal(r1.status, 0);
    assert.match(r1.stdout, /m1\s+\[platform\]/);
    assert.match(r1.stdout, /Active initiative: memory-module/);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem requires a reachable ecosystem root (ENH-021: location-agnostic)', () => {
  const tmp = mktmp();
  try {
    const res = runCli(['ecosystem', 'status'], { cwd: tmp });
    assert.notEqual(res.status, 0);
    // ENH-021 reworded the error to teach the user about --ecosystem and
    // walk-up resolution. Behavior unchanged: still errors when no
    // ecosystem is reachable.
    assert.match(res.stderr, /no ecosystem\.json found/i);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Pointer helpers (unit)
// ─────────────────────────────────────────────────────────────────────────────

test('ensurePointerInjected inserts after H1 and is idempotent', () => {
  const tmp = mktmp();
  try {
    const claudePath = path.join(tmp, 'CLAUDE.md');
    write(claudePath, '# Project\n\nSome content.\n');
    const fakeRoot = path.join(tmp, 'eco-root');
    fs.mkdirSync(fakeRoot);
    eco.ensurePointerInjected(tmp, 'CLAUDE.md', fakeRoot, 'eco');
    const after = read(claudePath);
    assert.match(after, /<!-- ecosystem:begin/);
    // Pointer inserted after H1.
    const idxH1 = after.indexOf('# Project');
    const idxBegin = after.indexOf('<!-- ecosystem:begin');
    assert.ok(idxBegin > idxH1, 'pointer must follow the H1');

    // Re-running is a no-op.
    eco.ensurePointerInjected(tmp, 'CLAUDE.md', fakeRoot, 'eco');
    assert.equal(read(claudePath), after);
  } finally {
    rmrf(tmp);
  }
});

test('stripPointer removes the fenced block cleanly', () => {
  const tmp = mktmp();
  try {
    const p = path.join(tmp, 'CLAUDE.md');
    write(p,
      '# X\n\n<!-- ecosystem:begin -->\n> pointer\n<!-- ecosystem:end -->\n\nbody\n');
    eco.stripPointer(p);
    const after = read(p);
    assert.doesNotMatch(after, /ecosystem:/);
    assert.match(after, /# X/);
    assert.match(after, /body/);
  } finally {
    rmrf(tmp);
  }
});

test('sanitizeId normalizes basenames', () => {
  assert.equal(eco.sanitizeId('Cerebrio-Sapience'), 'cerebrio-sapience');
  assert.equal(eco.sanitizeId('my_repo.123'), 'my-repo-123');
  assert.equal(eco.sanitizeId('--weird--'), 'weird');
});
