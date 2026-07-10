'use strict';

/**
 * Phase 30e G5 — two-clone multi-repo team plane, end-to-end (ADR-0015).
 *
 * One scenario exercises all three deliverables across TWO machines sharing one
 * ecosystem remote:
 *   D1 remote-URL members  — machine B resolves a co-located member (git state)
 *                            AND a remote-only member (by URL, reachable).
 *   D2 shared active-init   — machine A sets it; B pulls and sees it, attributed,
 *                            with zero git conflict.
 *   D3 swarm CAS ownership  — A wins repo ownership via ref-CAS; B's concurrent
 *                            takeover is fenced → no double-own.
 * All local (bare remotes on disk), no network, no server.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');
const manifestLib = require('../core/swarm/lib/manifest');
const conductor = require('../core/swarm/conductor');
const boardLib = require('../core/swarm/lib/board');

function git(cwd, ...a) {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')} failed: ${r.stderr}`);
  return r.stdout.trim();
}
function cfg(d) {
  git(d, 'config', 'user.email', 'm@x');
  git(d, 'config', 'user.name', 'M');
  git(d, 'config', 'commit.gpgsign', 'false');
}

/** A swarm projection at `root` (repo `a`, owned by sess-old, lease `expiry`). */
function buildSwarm(root, expiry) {
  const eco = {
    name: 'e2e', version: 1,
    members: [{ id: 'a', path: 'a', role: 'library' }], dependencies: [],
  };
  fs.mkdirSync(path.join(root, 'a'), { recursive: true });
  const manifest = conductor.planSwarm({
    ecosystemRoot: root, swarmId: '0001-foo', initiative: 'foo',
    impactedRepos: ['a'], phaseSlug: 'phase-1-foo', sessionId: 'sess-old', mode: 'checkpoint',
    nowIso: '2026-06-14T17:00:00Z', ecosystemManifest: eco,
  });
  manifestLib.writeManifest(root, '0001-foo', manifest);
  manifestLib.updateManifest(root, '0001-foo', (m) => {
    m.repos.a.owner = 'sess-old';
    m.repos.a.lease_expires_at = expiry;
  });
  boardLib.refreshBoard(root, '0001-foo', '2026-06-14T17:00:00Z');
}

test('two-clone multi-repo team plane: remote members + shared initiative + swarm CAS ownership', () => {
  const tmp = mktmp('eco-e2e-');
  try {
    // Shared remotes: the ecosystem repo + a bare standing in for the remote member.
    const ecoBare = path.join(tmp, 'eco.git');
    const svcBare = path.join(tmp, 'svc.git');
    git(tmp, 'init', '--bare', '-q', '-b', 'main', ecoBare);
    git(tmp, 'init', '--bare', '-q', '-b', 'main', svcBare);
    const seed = path.join(tmp, 'svc-seed');
    fs.mkdirSync(seed);
    git(seed, 'init', '-q', '-b', 'main'); cfg(seed);
    fs.writeFileSync(path.join(seed, 'f'), 'x');
    git(seed, 'add', '.'); git(seed, 'commit', '-q', '-m', 'seed');
    git(seed, 'push', '-q', `file://${svcBare}`, 'main');

    // ── Machine A: clone the ecosystem, register members, set active initiative ──
    const mA = path.join(tmp, 'mA'); fs.mkdirSync(mA);
    const A = path.join(mA, 'eco');
    git(mA, 'clone', '-q', ecoBare, A); cfg(A);
    // A's co-located member checkout (relative ../app from the eco root).
    const appA = path.join(mA, 'app');
    fs.mkdirSync(appA); fs.writeFileSync(path.join(appA, 'CLAUDE.md'), '# app');
    git(appA, 'init', '-q'); cfg(appA); git(appA, 'add', '.'); git(appA, 'commit', '-q', '-m', 'app');

    fs.mkdirSync(path.join(A, 'initiatives'));
    fs.writeFileSync(path.join(A, '.gitignore'), '.state/\n');
    fs.writeFileSync(path.join(A, 'ecosystem.json'), JSON.stringify({
      name: 'e2e', version: 1, members: [
        { id: 'app', path: '../app', role: 'client' },
        { id: 'svc', remote: `file://${svcBare}`, role: 'platform' },
      ],
    }, null, 2));
    git(A, 'add', '-A'); git(A, 'commit', '-q', '-m', 'seed eco'); git(A, 'push', '-q', 'origin', 'main');

    const create = runCli(
      ['ecosystem', 'initiative', 'create', 'cross-cut', '--why', 'x', '--repos', 'app,svc', '--owner', 'alice', '--ecosystem', A],
      { env: { ...process.env, MOMENTUM_ACTOR: 'alice' } });
    assert.equal(create.status, 0, create.stderr);
    git(A, 'add', '-A'); git(A, 'commit', '-q', '-m', 'alice: active initiative'); git(A, 'push', '-q', 'origin', 'main');

    // ── Machine B: clone the ecosystem; its own app checkout ──
    const mB = path.join(tmp, 'mB'); fs.mkdirSync(mB);
    const B = path.join(mB, 'eco');
    git(mB, 'clone', '-q', ecoBare, B); cfg(B);
    const appB = path.join(mB, 'app');
    fs.mkdirSync(appB); git(appB, 'init', '-q');

    // D1 + D2: B resolves both members AND sees the shared, attributed initiative.
    const st = runCli(['ecosystem', 'status', '--ecosystem', B], { env: { ...process.env, MOMENTUM_ACTOR: 'bob' } });
    assert.equal(st.status, 0, st.stderr);
    assert.match(st.stdout, /app\s+\[client\]\s+\.\.\/app/, 'co-located member resolves');
    assert.match(st.stdout, /svc\s+\[platform\]\s+remote: file:\/\//, 'remote-URL member resolves by URL');
    assert.match(st.stdout, /remote: reachable/, 'remote member is reachable');
    assert.match(st.stdout, /Active initiative: cross-cut\s+\(set by 'alice'\)/, 'shared attributed initiative');

    // D3: swarm ownership arbitrated by the shared ref-CAS (default-on, remote present).
    buildSwarm(A, '2000-01-01T00:00:00Z');
    buildSwarm(B, '2000-01-01T00:00:00Z');
    manifestLib.updateManifestAsOwner({
      ecosystemRoot: A, swarmId: '0001-foo', sessionId: 'sess-A', repo: 'a', nowIso: '2026-07-10T00:00:00Z',
      mutate: (m) => { m.repos.a.owner = 'sess-A'; m.repos.a.lease_expires_at = '2099-01-01T00:00:00Z'; return m; },
    });
    assert.equal(manifestLib.loadManifest(A, '0001-foo').repos.a.owner, 'sess-A');
    assert.throws(() => manifestLib.updateManifestAsOwner({
      ecosystemRoot: B, swarmId: '0001-foo', sessionId: 'sess-B', repo: 'a', nowIso: '2026-07-10T00:00:01Z',
      mutate: (m) => { m.repos.a.owner = 'sess-B'; m.repos.a.lease_expires_at = '2099-01-01T00:00:00Z'; return m; },
    }), /fenced/, 'B fenced by the shared ref-CAS — no double-own');
    assert.equal(manifestLib.loadManifest(B, '0001-foo').repos.a.owner, 'sess-old');
  } finally {
    rmrf(tmp);
  }
});
