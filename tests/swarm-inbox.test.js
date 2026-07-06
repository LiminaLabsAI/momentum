'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');
const inboxLib = require('../core/swarm/inbox');
const manifestLib = require('../core/swarm/lib/manifest');
const conductor = require('../core/swarm/conductor');
const boardLib = require('../core/swarm/lib/board');

function fixture(tmp) {
  const eco = {
    name: 'test-eco', version: 1, created: '2026-06-12',
    members: [
      { id: 'a', path: 'a', role: 'library' },
      { id: 'b', path: 'b', role: 'platform' },
    ],
    dependencies: [{ from: 'b', to: 'a' }],
  };
  fs.writeFileSync(path.join(tmp, 'ecosystem.json'), JSON.stringify(eco, null, 2));
  for (const m of eco.members) fs.mkdirSync(path.join(tmp, m.path), { recursive: true });
  const manifest = conductor.planSwarm({
    ecosystemRoot: tmp, swarmId: '0001-foo', initiative: 'foo',
    impactedRepos: ['a', 'b'], phaseSlug: 'phase-1-foo',
    sessionId: 'sess', mode: 'checkpoint',
    nowIso: '2026-06-12T17:00:00Z', ecosystemManifest: eco,
  });
  manifestLib.writeManifest(tmp, '0001-foo', manifest);
  boardLib.refreshBoard(tmp, '0001-foo', '2026-06-12T17:00:00Z');
}

// ─────────────────────────────────────────────────────────────────────────────
// Library — write / list / resolve
// ─────────────────────────────────────────────────────────────────────────────

test('writeInboxItem — creates NNNN-slug.md and updates INDEX', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    const r = inboxLib.writeInboxItem({
      ecosystemRoot: tmp, swarmId: '0001-foo', repo: 'a',
      slug: 'token-shape', question: 'Should tokens be opaque strings or JWTs?',
      nowIso: '2026-06-12T17:30:00Z',
    });
    assert.equal(r.id, '0001');
    assert.match(r.filePath, /0001-token-shape\.md$/);
    const content = fs.readFileSync(r.filePath, 'utf8');
    assert.match(content, /^# 0001 — token-shape/);
    assert.match(content, /- Repo: `a`/);
    assert.match(content, /- Status: pending/);
    assert.match(content, /Should tokens be opaque/);

    const indexPath = inboxLib.indexPath(tmp, '0001-foo');
    const idx = fs.readFileSync(indexPath, 'utf8');
    assert.match(idx, /0001/);
    assert.match(idx, /token-shape/);
  } finally {
    rmrf(tmp);
  }
});

test('writeInboxItem — sequential ids across multiple writes', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    const a = inboxLib.writeInboxItem({
      ecosystemRoot: tmp, swarmId: '0001-foo', repo: 'a', slug: 'q-one',
      question: 'first', nowIso: '2026-06-12T17:30:00Z',
    });
    const b = inboxLib.writeInboxItem({
      ecosystemRoot: tmp, swarmId: '0001-foo', repo: 'b', slug: 'q-two',
      question: 'second', nowIso: '2026-06-12T17:31:00Z',
    });
    assert.equal(a.id, '0001');
    assert.equal(b.id, '0002');
  } finally {
    rmrf(tmp);
  }
});

test('writeInboxItem — rejects invalid slug / question / repo', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    assert.throws(() => inboxLib.writeInboxItem({
      ecosystemRoot: tmp, swarmId: '0001-foo', repo: 'a', slug: 'Bad Slug',
      question: 'q', nowIso: '2026-06-12T17:00:00Z',
    }), /invalid slug/);
    assert.throws(() => inboxLib.writeInboxItem({
      ecosystemRoot: tmp, swarmId: '0001-foo', repo: 'a', slug: 'ok',
      question: '', nowIso: '2026-06-12T17:00:00Z',
    }), /question required/);
    assert.throws(() => inboxLib.writeInboxItem({
      ecosystemRoot: tmp, swarmId: '0001-foo', repo: '!', slug: 'ok',
      question: 'q', nowIso: '2026-06-12T17:00:00Z',
    }), /invalid repo/);
  } finally {
    rmrf(tmp);
  }
});

test('listPendingInboxItems — returns sorted by id', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    inboxLib.writeInboxItem({ ecosystemRoot: tmp, swarmId: '0001-foo', repo: 'a', slug: 'q-one', question: 'q', nowIso: '2026-06-12T17:00:00Z' });
    inboxLib.writeInboxItem({ ecosystemRoot: tmp, swarmId: '0001-foo', repo: 'b', slug: 'q-two', question: 'q', nowIso: '2026-06-12T17:00:00Z' });
    inboxLib.writeInboxItem({ ecosystemRoot: tmp, swarmId: '0001-foo', repo: 'a', slug: 'q-three', question: 'q', nowIso: '2026-06-12T17:00:00Z' });
    const items = inboxLib.listPendingInboxItems(tmp, '0001-foo');
    assert.deepEqual(items.map((it) => it.id), ['0001', '0002', '0003']);
    assert.equal(items[0].repo, 'a');
    assert.equal(items[1].repo, 'b');
  } finally {
    rmrf(tmp);
  }
});

test('resolveInboxItem — moves to resolved/ + appends answer', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    const r = inboxLib.writeInboxItem({
      ecosystemRoot: tmp, swarmId: '0001-foo', repo: 'a', slug: 'q-one',
      question: 'q', nowIso: '2026-06-12T17:00:00Z',
    });
    inboxLib.resolveInboxItem({
      ecosystemRoot: tmp, swarmId: '0001-foo', id: r.id,
      answer: 'Use opaque strings for the MVP.', nowIso: '2026-06-12T17:30:00Z',
    });

    // Original gone
    assert.equal(fs.existsSync(r.filePath), false);
    // Moved to resolved/
    const resolvedPath = path.join(inboxLib.resolvedDir(tmp, '0001-foo'), `${r.id}-q-one.md`);
    assert.equal(fs.existsSync(resolvedPath), true);
    const resolved = fs.readFileSync(resolvedPath, 'utf8');
    assert.match(resolved, /- Status: resolved/);
    assert.match(resolved, /## Answer \(resolved at 2026-06-12T17:30:00Z\)/);
    assert.match(resolved, /opaque strings/);

    // INDEX no longer shows it
    const idx = fs.readFileSync(inboxLib.indexPath(tmp, '0001-foo'), 'utf8');
    assert.match(idx, /no pending items/);

    // Audit log gains an inbox-resolved event
    const manifest = manifestLib.loadManifest(tmp, '0001-foo');
    assert.ok(manifest.audit.some((a) => a.event === 'inbox-resolved'));
  } finally {
    rmrf(tmp);
  }
});

test('nextInboxId — counts both pending and resolved', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    const a = inboxLib.writeInboxItem({ ecosystemRoot: tmp, swarmId: '0001-foo', repo: 'a', slug: 'one', question: 'q', nowIso: '2026-06-12T17:00:00Z' });
    inboxLib.resolveInboxItem({ ecosystemRoot: tmp, swarmId: '0001-foo', id: a.id, answer: 'a', nowIso: '2026-06-12T17:01:00Z' });
    const b = inboxLib.writeInboxItem({ ecosystemRoot: tmp, swarmId: '0001-foo', repo: 'b', slug: 'two', question: 'q', nowIso: '2026-06-12T17:02:00Z' });
    assert.equal(b.id, '0002', 'should continue past the resolved 0001');
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CLI — inbox write/list/resolve
// ─────────────────────────────────────────────────────────────────────────────

function setupFullFixture(tmp) {
  fixture(tmp);
  fs.mkdirSync(path.join(tmp, 'initiatives'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'initiatives', '0001-foo.md'),
    '---\nid: 1\nslug: foo\nstatus: in-progress\nstarted: 2026-06-12\nowner: test\nrepos: [a, b]\n---\n\n# Foo\n',
  );
}

test('CLI — inbox write/list/resolve round-trip', () => {
  const tmp = mktmp();
  try {
    setupFullFixture(tmp);
    let r = runCli(['swarm', 'inbox', 'write', '0001-foo',
      '--repo', 'a', '--slug', 'token-shape',
      '--question', 'Opaque or JWT?',
      '--ecosystem', tmp], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /0001-token-shape\.md written/);

    r = runCli(['swarm', 'inbox', 'list', '0001-foo', '--ecosystem', tmp, '--json'], { cwd: tmp });
    assert.equal(r.status, 0);
    const items = JSON.parse(r.stdout);
    assert.equal(items.length, 1);
    assert.equal(items[0].id, '0001');

    r = runCli(['swarm', 'inbox', 'resolve', '0001-foo', '0001',
      '--answer', 'Use opaque tokens.', '--ecosystem', tmp], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /resolved/);

    r = runCli(['swarm', 'inbox', 'list', '0001-foo', '--ecosystem', tmp, '--json'], { cwd: tmp });
    const empty = JSON.parse(r.stdout);
    assert.deepEqual(empty, []);
  } finally {
    rmrf(tmp);
  }
});

test('CLI — inbox unknown subcommand errors clearly', () => {
  const r = runCli(['swarm', 'inbox', 'bogus']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /unknown subcommand/);
});
