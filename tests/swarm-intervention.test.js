'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');
const manifestLib = require('../core/swarm/lib/manifest');

function setupFixture(tmp) {
  const eco = {
    name: 'test-eco', version: 1, created: '2026-06-12',
    members: [
      { id: 'a', path: 'a', role: 'library' },
      { id: 'b', path: 'b', role: 'platform' },
    ],
    dependencies: [{ from: 'b', to: 'a' }],
  };
  fs.writeFileSync(path.join(tmp, 'ecosystem.json'), JSON.stringify(eco, null, 2));
  for (const m of eco.members) {
    fs.mkdirSync(path.join(tmp, m.path, 'specs', 'phases', 'phase-1-foo'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, m.path, 'specs', 'phases', 'phase-1-foo', 'overview.md'),
      '# Phase 1 — Foo\n',
    );
  }
  fs.mkdirSync(path.join(tmp, 'initiatives'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'initiatives', '0001-foo.md'),
    '---\nid: 1\nslug: foo\nstatus: in-progress\nstarted: 2026-06-12\nowner: test\nrepos: [a, b]\n---\n\n# Foo\n',
  );
  const r = runCli(['swarm', 'start', 'foo', '--initiative', 'foo', '--repos', 'a,b',
    '--phase', 'phase-1-foo', '--ecosystem', tmp, '--json'], { cwd: tmp });
  if (r.status !== 0) throw new Error(`fixture setup failed: ${r.stderr}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// /swarm tell
// ─────────────────────────────────────────────────────────────────────────────

test('CLI tell — appends to single supervisor swarm-context.md', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const r = runCli(['swarm', 'tell', '0001-foo', 'a', 'Token format is opaque, not JWT.',
      '--ecosystem', tmp], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /tell delivered to a/);

    const contextPath = path.join(tmp, 'a', 'specs', 'phases', 'phase-1-foo', 'swarm-context.md');
    assert.ok(fs.existsSync(contextPath));
    const body = fs.readFileSync(contextPath, 'utf8');
    assert.match(body, /## tell @/);
    assert.match(body, /opaque, not JWT/);

    // Other supervisor untouched
    const otherPath = path.join(tmp, 'b', 'specs', 'phases', 'phase-1-foo', 'swarm-context.md');
    assert.equal(fs.existsSync(otherPath), false);

    // Audit log
    const manifest = manifestLib.loadManifest(tmp, '0001-foo');
    assert.ok(manifest.audit.some((x) => x.event === 'tell' && x.repo === 'a'));
  } finally {
    rmrf(tmp);
  }
});

test('CLI tell — rejects repo not in swarm', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const r = runCli(['swarm', 'tell', '0001-foo', 'ghost', 'hi', '--ecosystem', tmp], { cwd: tmp });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /not a member/);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// /swarm broadcast
// ─────────────────────────────────────────────────────────────────────────────

test('CLI broadcast — appends to every supervisor', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const r = runCli(['swarm', 'broadcast', '0001-foo', 'Stop and wait for go-ahead before running migrations.',
      '--ecosystem', tmp], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /broadcast sent to 2 repos/);

    for (const repoId of ['a', 'b']) {
      const ctx = path.join(tmp, repoId, 'specs', 'phases', 'phase-1-foo', 'swarm-context.md');
      assert.ok(fs.existsSync(ctx), `${repoId} should have context appended`);
      assert.match(fs.readFileSync(ctx, 'utf8'), /broadcast @/);
    }

    const manifest = manifestLib.loadManifest(tmp, '0001-foo');
    assert.ok(manifest.audit.some((x) => x.event === 'broadcast'));
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// /swarm budget
// ─────────────────────────────────────────────────────────────────────────────

test('CLI budget +N — extends tokens_budget for a repo', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const before = manifestLib.loadManifest(tmp, '0001-foo');
    const initial = before.repos.a.tokens_budget;
    const r = runCli(['swarm', 'budget', '0001-foo', 'a', '+50000', '--ecosystem', tmp], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /budget\(a\) adjusted by 50000/);
    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(after.repos.a.tokens_budget, initial + 50000);
    assert.ok(after.audit.some((x) => x.event === 'budget' && x.repo === 'a'));
  } finally {
    rmrf(tmp);
  }
});

test('CLI budget -N — reduces but never below 1', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const r = runCli(['swarm', 'budget', '0001-foo', 'a', '-999999', '--ecosystem', tmp], { cwd: tmp });
    assert.equal(r.status, 0);
    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(after.repos.a.tokens_budget, 1);
  } finally {
    rmrf(tmp);
  }
});

test('CLI budget — rejects unknown repo', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const r = runCli(['swarm', 'budget', '0001-foo', 'ghost', '+1000', '--ecosystem', tmp], { cwd: tmp });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /not a member/);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// /swarm verify
// ─────────────────────────────────────────────────────────────────────────────

test('CLI verify — accepts well-formed swarm (briefs need frontmatter)', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    // Inject brief frontmatter to match the swarm
    const conductor = require('../core/swarm/conductor');
    conductor.injectBriefFrontmatter(path.join(tmp, 'a'), 'phase-1-foo', {
      swarm: '0001-foo', wave: 1, initiative: 'foo', claimed_by_session: 'sess',
    });
    conductor.injectBriefFrontmatter(path.join(tmp, 'b'), 'phase-1-foo', {
      swarm: '0001-foo', wave: 2, initiative: 'foo', claimed_by_session: 'sess',
    });
    const r = runCli(['swarm', 'verify', '0001-foo', '--ecosystem', tmp, '--json'], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    const result = JSON.parse(r.stdout);
    assert.equal(result.ok, true, JSON.stringify(result.issues));
    assert.ok(result.notes.some((n) => /initiative/.test(n)));
  } finally {
    rmrf(tmp);
  }
});

test('CLI verify — fails when brief frontmatter missing', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const r = runCli(['swarm', 'verify', '0001-foo', '--ecosystem', tmp, '--json'], { cwd: tmp });
    assert.notEqual(r.status, 0);
    const result = JSON.parse(r.stdout);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => /no swarm frontmatter/.test(i)));
  } finally {
    rmrf(tmp);
  }
});

test('CLI verify — fails when initiative missing', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    fs.unlinkSync(path.join(tmp, 'initiatives', '0001-foo.md'));
    const r = runCli(['swarm', 'verify', '0001-foo', '--ecosystem', tmp, '--json'], { cwd: tmp });
    assert.notEqual(r.status, 0);
    const result = JSON.parse(r.stdout);
    assert.ok(result.issues.some((i) => /initiative.*not found/.test(i)));
  } finally {
    rmrf(tmp);
  }
});
