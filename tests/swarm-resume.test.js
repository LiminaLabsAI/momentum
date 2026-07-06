'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');
const conductor = require('../core/swarm/conductor');
const manifestLib = require('../core/swarm/lib/manifest');
const boardLib = require('../core/swarm/lib/board');

function setupFixture(tmp, mode = 'checkpoint') {
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
  fs.mkdirSync(path.join(tmp, 'initiatives'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'initiatives', '0001-foo.md'),
    '---\nid: 1\nslug: foo\nstatus: in-progress\nstarted: 2026-06-12\nowner: test\nrepos: [a, b]\n---\n\n# Foo\n',
  );
  const manifest = conductor.planSwarm({
    ecosystemRoot: tmp, swarmId: '0001-foo', initiative: 'foo',
    impactedRepos: ['a', 'b'], phaseSlug: 'phase-1-foo',
    sessionId: 'sess_original', mode,
    nowIso: '2026-06-12T17:00:00Z', ecosystemManifest: eco,
  });
  manifestLib.writeManifest(tmp, '0001-foo', manifest);
  boardLib.refreshBoard(tmp, '0001-foo', '2026-06-12T17:00:00Z');
}

// ─────────────────────────────────────────────────────────────────────────────
// Library — disk-only reconstitution
// ─────────────────────────────────────────────────────────────────────────────

test('resumeSwarm — reconstitutes purely from disk (mid-wave kill)', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    // Simulate progress: tick to start wave 1, mark repo a partially done
    conductor.pollTurn({ ecosystemRoot: tmp, swarmId: '0001-foo', nowIso: '2026-06-12T17:01:00Z' });
    manifestLib.updateManifest(tmp, '0001-foo', (m) => {
      m.repos.a.tasks_done = 3;
      m.repos.a.tasks_total = 7;
      m.repos.a.tokens_used = 50000;
      m.repos.a.last_seen_sha = 'abcdef1234567';
    });

    // Simulate "kill" — drop everything we'd have in memory and only
    // load via the public resume API.
    const after = conductor.resumeSwarm(tmp, '0001-foo', 'sess_resumed', '2026-06-12T18:00:00Z');

    assert.equal(after.swarm_id, '0001-foo');
    assert.equal(after.repos.a.tasks_done, 3, 'mid-wave progress preserved');
    assert.equal(after.repos.a.tokens_used, 50000);
    assert.equal(after.repos.a.last_seen_sha, 'abcdef1234567');
    assert.equal(after.waves[0].status, 'running', 'wave 1 still running');

    const resumeAudit = after.audit.filter((a) => a.event === 'resume');
    assert.equal(resumeAudit.length, 1);
    assert.equal(resumeAudit[0].actor, 'sess_resumed');
  } finally {
    rmrf(tmp);
  }
});

test('resumeSwarm — board.json freshly materialized after resume', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    conductor.resumeSwarm(tmp, '0001-foo', 'sess_new', '2026-06-12T18:00:00Z');
    const board = boardLib.loadBoard(tmp, '0001-foo');
    assert.equal(board.rendered_at, '2026-06-12T18:00:00Z');
  } finally {
    rmrf(tmp);
  }
});

test('resumeSwarm — adds session to sessions[] registry', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    conductor.resumeSwarm(tmp, '0001-foo', 'sess_a', '2026-06-12T18:00:00Z');
    conductor.resumeSwarm(tmp, '0001-foo', 'sess_b', '2026-06-12T19:00:00Z');
    conductor.resumeSwarm(tmp, '0001-foo', 'sess_a', '2026-06-12T20:00:00Z');

    const manifest = manifestLib.loadManifest(tmp, '0001-foo');
    // Original + sess_a + sess_b = 3
    assert.equal(manifest.sessions.length, 3);
    const sessA = manifest.sessions.find((s) => s.session_id === 'sess_a');
    assert.equal(sessA.last_seen, '2026-06-12T20:00:00Z', 'last_seen updated');
    assert.equal(sessA.first_seen, '2026-06-12T18:00:00Z', 'first_seen preserved');
  } finally {
    rmrf(tmp);
  }
});

test('resumeSwarm — survives cancel + resume round-trip', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    conductor.cancelSwarm(tmp, '0001-foo', 'test', '2026-06-12T17:30:00Z');
    const after = conductor.resumeSwarm(tmp, '0001-foo', 'sess_resumed', '2026-06-12T18:00:00Z');
    assert.equal(after.status, 'cancelled', 'resume does not un-cancel');
    assert.equal(after.repos.a.status, 'cancelled');
    // resume audit still fired
    assert.ok(after.audit.some((a) => a.event === 'resume'));
  } finally {
    rmrf(tmp);
  }
});

test('resumeSwarm — throws for missing manifest', () => {
  const tmp = mktmp();
  try {
    assert.throws(() => conductor.resumeSwarm(tmp, '0999-ghost', 'sess', '2026-06-12T18:00:00Z'),
      /no manifest/);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CLI — resume
// ─────────────────────────────────────────────────────────────────────────────

test('CLI resume — returns JSON with board + status', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const r = runCli(['swarm', 'resume', '0001-foo',
      '--session', 'sess_cli', '--ecosystem', tmp, '--json'], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.swarmId, '0001-foo');
    assert.equal(out.sessionId, 'sess_cli');
    assert.ok(out.board);
    assert.equal(out.board.swarm_id, '0001-foo');
  } finally {
    rmrf(tmp);
  }
});

test('CLI resume — auto-generates session id when not passed', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const r = runCli(['swarm', 'resume', '0001-foo', '--ecosystem', tmp, '--json'], { cwd: tmp });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.match(out.sessionId, /^sess_[a-f0-9]+$/);
  } finally {
    rmrf(tmp);
  }
});

test('CLI resume — surfaces pending inbox count', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const inboxLib = require('../core/swarm/inbox');
    inboxLib.writeInboxItem({
      ecosystemRoot: tmp, swarmId: '0001-foo', repo: 'a', slug: 'q-x',
      question: 'q', nowIso: '2026-06-12T17:30:00Z',
    });
    boardLib.refreshBoard(tmp, '0001-foo', '2026-06-12T17:30:00Z');

    const r = runCli(['swarm', 'resume', '0001-foo', '--ecosystem', tmp], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /pending inbox/);
  } finally {
    rmrf(tmp);
  }
});

test('CLI resume — renews lease for owned repos', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const before = manifestLib.loadManifest(tmp, '0001-foo');
    const initialRenewal = before.repos.a.lease_renewed_at;
    // sess_original owns a + b
    const r = runCli(['swarm', 'resume', '0001-foo',
      '--session', 'sess_original', '--ecosystem', tmp, '--json'], { cwd: tmp });
    assert.equal(r.status, 0);
    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.notEqual(after.repos.a.lease_renewed_at, initialRenewal,
      'lease_renewed_at changed from initial plan timestamp');
    // Same 24h delta should hold post-renewal
    const diff = Date.parse(after.repos.a.lease_expires_at) -
                 Date.parse(after.repos.a.lease_renewed_at);
    assert.equal(diff, 24 * 3600 * 1000);
  } finally {
    rmrf(tmp);
  }
});
