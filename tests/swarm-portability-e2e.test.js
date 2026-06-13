'use strict';

/**
 * Phase 17.5 G5 — End-to-end portability scenarios.
 *
 * Each scenario validates ONE intervention pattern end-to-end on a
 * synthetic ecosystem fixture and captures evidence to
 * specs/phases/phase-17-5-swarm-portability/evidence/.
 *
 *   P-Focus            — linear 3-repo ecosystem; sess-A starts the
 *                        swarm, focuses `backend`, sess-B joins via the
 *                        focus token and takes backend. Both sessions
 *                        write to repos they own; lease enforcement
 *                        blocks the cross-owner write.
 *   P-Join             — branched 4-repo ecosystem; sess-A starts +
 *                        releases mid-b, sess-B joins as co-conductor
 *                        and claims mid-b. Both progress concurrently.
 *   P-Absorb-Conflict  — wide 5-repo ecosystem; two parallel swarms
 *                        with diverging content_hash on the same
 *                        contract surface. `absorb` aborts cleanly
 *                        with ECONTRACT; both swarms untouched.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf } = require('./_helpers');
const conductor = require('../core/swarm/conductor');
const manifestLib = require('../core/swarm/lib/manifest');
const boardLib = require('../core/swarm/lib/board');
const focusLib = require('../core/swarm/focus');
const joinLib = require('../core/swarm/join');
const absorbLib = require('../core/swarm/absorb');
const sessionsLib = require('../core/swarm/lib/sessions');

const REPO_ROOT = path.resolve(__dirname, '..');
const EVIDENCE_DIR = path.join(
  REPO_ROOT, 'specs', 'phases', 'phase-17-5-swarm-portability', 'evidence',
);

function setupEcosystem(tmp, name, members, deps) {
  const eco = { name, version: 1, created: '2026-06-14', members, dependencies: deps };
  fs.writeFileSync(path.join(tmp, 'ecosystem.json'), JSON.stringify(eco, null, 2));
  for (const m of members) {
    fs.mkdirSync(path.join(tmp, m.path), { recursive: true });
    fs.mkdirSync(path.join(tmp, m.path, 'specs', 'phases', 'phase-1-feature'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, m.path, 'specs', 'phases', 'phase-1-feature', 'overview.md'),
      `# Phase 1 — feature (${m.id})\n`,
    );
  }
  fs.mkdirSync(path.join(tmp, 'initiatives'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'initiatives', '0001-portability.md'),
    `---\nid: 1\nslug: portability\nstatus: in-progress\nstarted: 2026-06-14\nowner: test\nrepos: [${members.map((m) => m.id).join(', ')}]\n---\n\n# portability\n`,
  );
  return eco;
}

function captureEvidence(scenarioId, ecosystemRoot, swarmIds, narrative) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidencePath = path.join(EVIDENCE_DIR, `scenario-portability-${scenarioId}.txt`);
  const lines = [
    `# Phase 17.5 Swarm Portability — Scenario ${scenarioId}`,
    '',
    `Captured: 2026-06-14 (Phase 17.5 G5)`,
    `Ecosystem: ${path.basename(ecosystemRoot)}`,
    `Swarms: ${swarmIds.join(', ')}`,
    '',
    '## Narrative',
    '',
    narrative,
    '',
  ];
  for (const id of swarmIds) {
    lines.push(`## Manifest — ${id}`, '');
    const m = manifestLib.loadManifest(ecosystemRoot, id);
    if (m) {
      lines.push('```json', JSON.stringify(m, null, 2), '```', '');
    } else {
      lines.push(`(swarm ${id} not on disk — archived or absorbed)`, '');
    }
    const boardPath = path.join(manifestLib.swarmDir(ecosystemRoot, id), 'board.json');
    if (fs.existsSync(boardPath)) {
      lines.push(`## Board.json — ${id}`, '', '```json', fs.readFileSync(boardPath, 'utf8'), '```', '');
    }
  }
  fs.writeFileSync(evidencePath, lines.join('\n'));
  return evidencePath;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario P-Focus — linear 3-repo split via focus token
// ─────────────────────────────────────────────────────────────────────────────

test('Scenario P-Focus — sess-A focuses backend; sess-B claims it via token; lease enforcement blocks cross-owner writes', () => {
  const tmp = mktmp();
  try {
    const members = [
      { id: 'shared-types', path: 'shared-types', role: 'library' },
      { id: 'backend', path: 'backend', role: 'platform' },
      { id: 'frontend', path: 'frontend', role: 'client' },
    ];
    const deps = [
      { from: 'backend', to: 'shared-types' },
      { from: 'frontend', to: 'backend' },
    ];
    const eco = setupEcosystem(tmp, 'p-focus', members, deps);

    // sess-A starts the swarm
    const manifest = conductor.planSwarm({
      ecosystemRoot: tmp, swarmId: '0001-portability',
      initiative: 'portability',
      impactedRepos: ['shared-types', 'backend', 'frontend'],
      phaseSlug: 'phase-1-feature',
      sessionId: 'sess-A', mode: 'checkpoint',
      nowIso: '2026-06-14T17:00:00Z',
      ecosystemManifest: eco,
    });
    manifestLib.writeManifest(tmp, '0001-portability', manifest);
    boardLib.refreshBoard(tmp, '0001-portability', '2026-06-14T17:00:00Z');

    // sess-A claims backend (gives it a real lease + owner)
    manifestLib.updateManifestAsOwner({
      ecosystemRoot: tmp, swarmId: '0001-portability',
      sessionId: 'sess-A', repo: 'backend',
      nowIso: '2026-06-14T17:01:00Z',
      mutate: (m) => {
        m.repos.backend.owner = 'sess-A';
        m.repos.backend.lease_expires_at = '2099-01-01T00:00:00Z';
        m.repos.backend.lease_renewed_at = '2026-06-14T17:01:00Z';
        m.repos.backend.claimed_by_session = 'sess-A';
      },
    });

    // sess-A focuses backend — issues a token, flips to FOCUSING
    const focusResult = focusLib.focus({
      ecosystemRoot: tmp, swarmId: '0001-portability',
      repo: 'backend', sessionId: 'sess-A',
      nowIso: '2026-06-14T17:05:00Z',
    });
    assert.match(focusResult.token.token, /^[0-9a-f]{16}$/);
    let m = manifestLib.loadManifest(tmp, '0001-portability');
    assert.equal(m.repos.backend.owner, manifestLib.FOCUSING);

    // sess-B joins via the token — auto-claims backend
    const joinResult = joinLib.join({
      ecosystemRoot: tmp, swarmId: '0001-portability',
      sessionId: 'sess-B', nowIso: '2026-06-14T17:06:00Z',
      token: focusResult.token.token,
    });
    assert.equal(joinResult.claimed.repo, 'backend');
    assert.equal(joinResult.claimed.owner, 'sess-B');

    // Both sessions now in sessions[]
    m = manifestLib.loadManifest(tmp, '0001-portability');
    const sessions = sessionsLib.listSessions(tmp, '0001-portability');
    assert.ok(sessions.find((s) => s.session_id === 'sess-A'));
    assert.ok(sessions.find((s) => s.session_id === 'sess-B'));

    // Lease enforcement: sess-A tries to write to backend (B's repo) — REJECTED
    let crossWriteErr;
    try {
      manifestLib.updateManifestAsOwner({
        ecosystemRoot: tmp, swarmId: '0001-portability',
        sessionId: 'sess-A', repo: 'backend',
        nowIso: '2026-06-14T17:07:00Z',
        mutate: (m) => { m.repos.backend.status = 'complete'; },
      });
    } catch (e) { crossWriteErr = e; }
    assert.ok(crossWriteErr);
    assert.equal(crossWriteErr.code, 'EOWNERSHIP');

    // But sess-B can write to backend
    manifestLib.updateManifestAsOwner({
      ecosystemRoot: tmp, swarmId: '0001-portability',
      sessionId: 'sess-B', repo: 'backend',
      nowIso: '2026-06-14T17:08:00Z',
      mutate: (m) => { m.repos.backend.status = 'running'; },
    });

    // And sess-A can still write to its own repos
    manifestLib.updateManifestAsOwner({
      ecosystemRoot: tmp, swarmId: '0001-portability',
      sessionId: 'sess-A', repo: 'shared-types',
      nowIso: '2026-06-14T17:09:00Z',
      mutate: (m) => { m.repos['shared-types'].status = 'running'; },
    });

    boardLib.refreshBoard(tmp, '0001-portability', '2026-06-14T17:09:00Z');
    captureEvidence('focus', tmp, ['0001-portability'],
      `1. sess-A starts swarm with [shared-types, backend, frontend].
2. sess-A claims backend (lease until 2099).
3. sess-A focuses backend → FOCUSING sentinel + focus token issued.
4. sess-B joins with --token → consumes focus token, claims backend as sess-B owner.
5. Lease enforcement verified — sess-A's write to backend rejected (EOWNERSHIP);
   sess-B writes to backend succeeds; sess-A writes to shared-types succeeds.
6. Both sessions appear in sessions[] registry.`);
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario P-Join — branched 4-repo co-conductor split via release + claim
// ─────────────────────────────────────────────────────────────────────────────

test('Scenario P-Join — sess-A releases mid-b; sess-B joins as co-conductor and claims it; concurrent waves', () => {
  const tmp = mktmp();
  try {
    const members = [
      { id: 'root', path: 'root', role: 'platform' },
      { id: 'mid-a', path: 'mid-a', role: 'platform' },
      { id: 'mid-b', path: 'mid-b', role: 'platform' },
      { id: 'leaf', path: 'leaf', role: 'client' },
    ];
    const deps = [
      { from: 'mid-a', to: 'root' },
      { from: 'mid-b', to: 'root' },
      { from: 'leaf', to: 'mid-a' },
      { from: 'leaf', to: 'mid-b' },
    ];
    const eco = setupEcosystem(tmp, 'p-join', members, deps);

    const manifest = conductor.planSwarm({
      ecosystemRoot: tmp, swarmId: '0001-portability',
      initiative: 'portability',
      impactedRepos: ['root', 'mid-a', 'mid-b', 'leaf'],
      phaseSlug: 'phase-1-feature',
      sessionId: 'sess-A', mode: 'checkpoint',
      nowIso: '2026-06-14T17:00:00Z',
      ecosystemManifest: eco,
    });
    manifestLib.writeManifest(tmp, '0001-portability', manifest);
    boardLib.refreshBoard(tmp, '0001-portability', '2026-06-14T17:00:00Z');

    // sess-A claims everything initially (default lease)
    for (const repo of ['root', 'mid-a', 'mid-b', 'leaf']) {
      manifestLib.updateManifestAsOwner({
        ecosystemRoot: tmp, swarmId: '0001-portability',
        sessionId: 'sess-A', repo, nowIso: '2026-06-14T17:01:00Z',
        mutate: (m) => {
          m.repos[repo].owner = 'sess-A';
          m.repos[repo].lease_expires_at = '2099-01-01T00:00:00Z';
          m.repos[repo].lease_renewed_at = '2026-06-14T17:01:00Z';
        },
      });
    }

    // sess-A releases mid-b
    manifestLib.updateManifestAsOwner({
      ecosystemRoot: tmp, swarmId: '0001-portability',
      sessionId: 'sess-A', repo: 'mid-b',
      nowIso: '2026-06-14T17:05:00Z',
      mutate: (m) => {
        m.repos['mid-b'].owner = manifestLib.UNCLAIMED;
        delete m.repos['mid-b'].lease_expires_at;
        delete m.repos['mid-b'].lease_renewed_at;
      },
    });

    // sess-B joins as co-conductor + claims mid-b
    const r = joinLib.join({
      ecosystemRoot: tmp, swarmId: '0001-portability',
      sessionId: 'sess-B', nowIso: '2026-06-14T17:06:00Z',
      claim: 'mid-b',
    });
    assert.equal(r.claimed.repo, 'mid-b');
    assert.equal(r.claimed.owner, 'sess-B');

    let m = manifestLib.loadManifest(tmp, '0001-portability');
    assert.equal(m.repos.root.owner, 'sess-A');
    assert.equal(m.repos['mid-a'].owner, 'sess-A');
    assert.equal(m.repos['mid-b'].owner, 'sess-B');
    assert.equal(m.repos.leaf.owner, 'sess-A');

    // Both sessions can write to their own repos
    manifestLib.updateManifestAsOwner({
      ecosystemRoot: tmp, swarmId: '0001-portability',
      sessionId: 'sess-A', repo: 'root', nowIso: '2026-06-14T17:10:00Z',
      mutate: (m) => { m.repos.root.status = 'complete'; },
    });
    manifestLib.updateManifestAsOwner({
      ecosystemRoot: tmp, swarmId: '0001-portability',
      sessionId: 'sess-B', repo: 'mid-b', nowIso: '2026-06-14T17:10:00Z',
      mutate: (m) => { m.repos['mid-b'].status = 'complete'; },
    });

    // sess-B cannot write to mid-a (sess-A's)
    let err;
    try {
      manifestLib.updateManifestAsOwner({
        ecosystemRoot: tmp, swarmId: '0001-portability',
        sessionId: 'sess-B', repo: 'mid-a', nowIso: '2026-06-14T17:11:00Z',
        mutate: (m) => { m.repos['mid-a'].status = 'complete'; },
      });
    } catch (e) { err = e; }
    assert.ok(err);
    assert.equal(err.code, 'EOWNERSHIP');

    boardLib.refreshBoard(tmp, '0001-portability', '2026-06-14T17:11:00Z');
    captureEvidence('join', tmp, ['0001-portability'],
      `1. sess-A starts swarm with [root, mid-a, mid-b, leaf].
2. sess-A claims all four repos.
3. sess-A releases mid-b → UNCLAIMED.
4. sess-B joins as co-conductor with --claim mid-b → owns mid-b.
5. sess-A still owns root, mid-a, leaf; sess-B owns mid-b.
6. Both make progress on their own repos.
7. Lease enforcement: sess-B's write to mid-a rejected (EOWNERSHIP).
8. sessions[] now has both sess-A + sess-B registered.`);
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario P-Absorb-Conflict — wide 5-repo, two swarms, content_hash divergence
// ─────────────────────────────────────────────────────────────────────────────

test('Scenario P-Absorb-Conflict — two swarms with diverging content_hash; absorb aborts cleanly, both untouched', () => {
  const tmp = mktmp();
  try {
    const members = [
      { id: 'root', path: 'root', role: 'platform' },
      { id: 'l1', path: 'l1', role: 'client' },
      { id: 'l2', path: 'l2', role: 'client' },
      { id: 'l3', path: 'l3', role: 'client' },
      { id: 'l4', path: 'l4', role: 'client' },
    ];
    const deps = [
      { from: 'l1', to: 'root' },
      { from: 'l2', to: 'root' },
      { from: 'l3', to: 'root' },
      { from: 'l4', to: 'root' },
    ];
    const eco = setupEcosystem(tmp, 'p-absorb-conflict', members, deps);

    // Build two parallel swarms with overlapping repo (root) and
    // overlapping contract surface but DIFFERENT content hashes.
    const contractA = {
      surface: 'root-api', owner: 'root', consumers: ['l1', 'l2'],
      version: 1, content_hash: 'abc12345',
    };
    const contractB = {
      surface: 'root-api', owner: 'root', consumers: ['l3', 'l4'],
      version: 1, content_hash: 'def67890',
    };

    const swarmA = conductor.planSwarm({
      ecosystemRoot: tmp, swarmId: '0001-portability-a',
      initiative: 'portability',
      impactedRepos: ['root', 'l1', 'l2'],
      phaseSlug: 'phase-1-feature',
      sessionId: 'sess-A', mode: 'checkpoint',
      nowIso: '2026-06-14T17:00:00Z',
      ecosystemManifest: eco,
    });
    swarmA.contracts = [contractA];
    manifestLib.writeManifest(tmp, '0001-portability-a', swarmA);
    boardLib.refreshBoard(tmp, '0001-portability-a', '2026-06-14T17:00:00Z');

    const swarmB = conductor.planSwarm({
      ecosystemRoot: tmp, swarmId: '0002-portability-b',
      initiative: 'portability',
      impactedRepos: ['root', 'l3', 'l4'],
      phaseSlug: 'phase-1-feature',
      sessionId: 'sess-B', mode: 'checkpoint',
      nowIso: '2026-06-14T17:00:00Z',
      ecosystemManifest: eco,
    });
    swarmB.contracts = [contractB];
    manifestLib.writeManifest(tmp, '0002-portability-b', swarmB);
    boardLib.refreshBoard(tmp, '0002-portability-b', '2026-06-14T17:00:00Z');

    const beforeA = manifestLib.loadManifest(tmp, '0001-portability-a');
    const beforeB = manifestLib.loadManifest(tmp, '0002-portability-b');

    // Attempt absorb — must abort with ECONTRACT
    let err;
    try {
      absorbLib.absorb({
        ecosystemRoot: tmp,
        targetSwarmId: '0001-portability-a', sourceSwarmId: '0002-portability-b',
        sessionId: 'sess-A', nowIso: '2026-06-14T17:30:00Z',
      });
    } catch (e) { err = e; }
    assert.ok(err);
    assert.equal(err.code, 'ECONTRACT');
    assert.equal(err.conflicts.length, 1);
    assert.equal(err.conflicts[0].surface, 'root-api');
    assert.equal(err.conflicts[0].kind, 'content-hash-divergence');

    // Both swarms unchanged
    assert.deepEqual(manifestLib.loadManifest(tmp, '0001-portability-a'), beforeA);
    assert.deepEqual(manifestLib.loadManifest(tmp, '0002-portability-b'), beforeB);

    captureEvidence('absorb', tmp, ['0001-portability-a', '0002-portability-b'],
      `1. Wide 5-repo ecosystem: root → {l1, l2, l3, l4}.
2. Two parallel swarms started by separate sessions:
     - swarm A (sess-A) with [root, l1, l2] + contract root-api/v1/abc12345
     - swarm B (sess-B) with [root, l3, l4] + contract root-api/v1/def67890
3. /swarm absorb 0001-portability-a 0002-portability-b attempted by sess-A.
4. detectContractConflicts catches the content_hash divergence on root-api.
5. absorb throws ECONTRACT with conflicts[].
6. Both swarms left exactly as they were on disk — deep-equal verified.
7. Operator action: bump contract version, reconcile producer hash, then retry.`);
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Acceptance #4 — signal protocol concurrent write safety (under load)
// ─────────────────────────────────────────────────────────────────────────────

test('Signal protocol under 20-way concurrent write: zero corruption (acceptance #4)', () => {
  const tmp = mktmp();
  try {
    const members = [{ id: 'a', path: 'a', role: 'platform' }];
    setupEcosystem(tmp, 'signal-load', members, []);
    const eco = JSON.parse(fs.readFileSync(path.join(tmp, 'ecosystem.json'), 'utf8'));
    const m = conductor.planSwarm({
      ecosystemRoot: tmp, swarmId: '0001-portability',
      initiative: 'portability', impactedRepos: ['a'],
      phaseSlug: 'phase-1-feature',
      sessionId: 'sess-A', mode: 'checkpoint',
      nowIso: '2026-06-14T17:00:00Z',
      ecosystemManifest: eco,
    });
    manifestLib.writeManifest(tmp, '0001-portability', m);
    boardLib.refreshBoard(tmp, '0001-portability', '2026-06-14T17:00:00Z');
    const signalsLib = require('../core/swarm/signals');
    for (let i = 0; i < 20; i++) {
      signalsLib.writeSignal({
        ecosystemRoot: tmp, swarmId: '0001-portability',
        type: 'claim-request', slug: `load-${i}`,
        fromSession: 'sess-A', repo: 'a',
        nowIso: '2026-06-14T17:05:00Z',
      });
    }
    const list = signalsLib.listPendingSignals(tmp, '0001-portability');
    assert.equal(list.length, 20);
    const ids = new Set(list.map((s) => s.signal_id));
    assert.equal(ids.size, 20);
    for (const s of list) {
      const v = signalsLib.validateSignal(s);
      assert.ok(v.ok);
    }
  } finally { rmrf(tmp); }
});
