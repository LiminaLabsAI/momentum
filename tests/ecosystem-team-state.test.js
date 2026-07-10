'use strict';

/**
 * Phase 30e G2 — Ecosystem-state → fragments (ADR-0015).
 *
 * `active-initiative` (was per-machine `.state/`) and session-presence become
 * per-actor fragments committed in the ecosystem repo. Two clones setting the
 * active initiative concurrently merge with ZERO git conflict (own-prefix
 * files); the compiled value is global last-writer-wins, attributed.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');
const teamState = require('../core/ecosystem/lib/team-state');

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.trim();
}
function gitConfig(cwd) {
  git(cwd, ['config', 'user.email', 't@t']);
  git(cwd, ['config', 'user.name', 't']);
}

// ─── lib: fragment fold is global last-writer-wins + back-compat fallback ────

test('getActiveInitiative folds to the latest set across actors, attributed', () => {
  const root = mktmp();
  try {
    assert.equal(teamState.getActiveInitiative(root), null); // nothing yet
    teamState.setActiveInitiative(root, 'alice', 'alpha', { ts: '2026-07-10T10:00:00.000Z' });
    teamState.setActiveInitiative(root, 'bob', 'beta', { ts: '2026-07-10T11:00:00.000Z' });
    const active = teamState.getActiveInitiative(root);
    assert.equal(active.slug, 'beta');
    assert.equal(active.actor, 'bob');
    assert.equal(active.source, 'fragment');
  } finally {
    rmrf(root);
  }
});

test('a cleared (empty-slug) latest fragment resolves to null', () => {
  const root = mktmp();
  try {
    teamState.setActiveInitiative(root, 'alice', 'alpha', { ts: '2026-07-10T10:00:00.000Z' });
    teamState.setActiveInitiative(root, 'alice', '', { ts: '2026-07-10T12:00:00.000Z' });
    assert.equal(teamState.getActiveInitiative(root), null);
  } finally {
    rmrf(root);
  }
});

test('getActiveInitiative falls back to legacy .state/ when no fragments exist', () => {
  const root = mktmp();
  try {
    fs.mkdirSync(path.join(root, '.state'), { recursive: true });
    fs.writeFileSync(path.join(root, '.state', 'active-initiative'), 'legacy-one');
    const active = teamState.getActiveInitiative(root);
    assert.equal(active.slug, 'legacy-one');
    assert.equal(active.source, 'legacy');
    assert.equal(active.actor, null);
  } finally {
    rmrf(root);
  }
});

// ─── two clones set active-initiative concurrently → zero conflict merge ─────

test('two clones set active-initiative concurrently and merge without conflict', () => {
  const tmp = mktmp();
  try {
    const bare = path.join(tmp, 'eco.git');
    git(tmp, ['init', '--bare', '-b', 'main', bare]);

    // Clone A — seed the ecosystem repo with a manifest, push.
    const a = path.join(tmp, 'a');
    git(tmp, ['clone', bare, a]);
    gitConfig(a);
    fs.writeFileSync(path.join(a, 'ecosystem.json'), JSON.stringify({ name: 'demo', version: 1, members: [] }, null, 2));
    // Real ecosystem layout: .state/ is the gitignored per-machine cache, so it
    // never travels and can never conflict. The shared state rides fragments.
    fs.writeFileSync(path.join(a, '.gitignore'), '.state/\n');
    git(a, ['add', '.']);
    git(a, ['commit', '-m', 'seed']);
    git(a, ['push', 'origin', 'main']);

    // Clone B from the seeded remote.
    const b = path.join(tmp, 'b');
    git(tmp, ['clone', bare, b]);
    gitConfig(b);

    // Concurrent sets: alice in A (earlier), bob in B (later).
    teamState.setActiveInitiative(a, 'alice', 'alpha', { ts: '2026-07-10T10:00:00.000Z' });
    git(a, ['add', '.']);
    git(a, ['commit', '-m', 'alice sets alpha']);
    git(a, ['push', 'origin', 'main']);

    teamState.setActiveInitiative(b, 'bob', 'beta', { ts: '2026-07-10T11:00:00.000Z' });
    git(b, ['add', '.']);
    git(b, ['commit', '-m', 'bob sets beta']);

    // B integrates A's change — DIFFERENT files (alice-*.json vs bob-*.json),
    // so the merge is conflict-free by construction.
    git(b, ['fetch', 'origin']);
    const merge = spawnSync('git', ['merge', '--no-edit', 'origin/main'], { cwd: b, encoding: 'utf8' });
    assert.equal(merge.status, 0, `merge must be conflict-free:\n${merge.stdout}\n${merge.stderr}`);

    // Both fragments present after merge; compiled value is the latest (bob).
    const active = teamState.getActiveInitiative(b);
    assert.equal(active.slug, 'beta');
    assert.equal(active.actor, 'bob');

    const viewDir = path.join(b, '.momentum', 'team', 'eco-active-initiative');
    const files = fs.readdirSync(viewDir).sort();
    assert.equal(files.length, 2, `expected both actors' fragments, got ${files.join(', ')}`);
    assert.ok(files.some((f) => f.startsWith('alice-')));
    assert.ok(files.some((f) => f.startsWith('bob-')));
  } finally {
    rmrf(tmp);
  }
});

// ─── CLI: initiative create sets a shared attributed active initiative ───────

test('ecosystem status shows the shared, attributed active initiative + presence', () => {
  const tmp = mktmp();
  try {
    const root = path.join(tmp, 'eco');
    fs.mkdirSync(root);
    git(root, ['init']);
    gitConfig(root);
    fs.writeFileSync(path.join(root, 'ecosystem.json'), JSON.stringify({
      name: 'demo', version: 1,
      members: [{ id: 'a', path: '../a', role: 'platform' }],
    }, null, 2));
    fs.mkdirSync(path.join(root, 'initiatives')); // real ecosystem layout (from `ecosystem init`)
    // member dir so status doesn't choke resolving it
    fs.mkdirSync(path.join(tmp, 'a'));

    const env = { ...process.env, MOMENTUM_ACTOR: 'carol' };
    const create = runCli(['ecosystem', 'initiative', 'create', 'big-thing',
      '--why', 'x', '--repos', 'a', '--owner', 'carol', '--ecosystem', root], { env });
    assert.equal(create.status, 0, create.stderr);
    assert.match(create.stdout, /Set as active initiative \(as 'carol'\)/);

    // The fragment landed in the committed team dir (not just .state/).
    assert.ok(fs.existsSync(path.join(root, '.momentum', 'team', 'eco-active-initiative')));

    const status = runCli(['ecosystem', 'status', '--no-git', '--ecosystem', root], { env });
    assert.equal(status.status, 0, status.stderr);
    assert.match(status.stdout, /Active initiative: big-thing\s+\(set by 'carol'\)/);
    // Auto-heartbeat marked carol present.
    assert.match(status.stdout, /Presence:/);
    assert.match(status.stdout, /carol\s+active/);
  } finally {
    rmrf(tmp);
  }
});
