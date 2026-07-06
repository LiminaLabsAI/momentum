'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { mktmp, rmrf } = require('./_helpers');
const manifestLib = require('../core/swarm/lib/manifest');
const boardLib = require('../core/swarm/lib/board');
const gitSha = require('../core/swarm/lib/git-sha-cache');
const incLog = require('../core/swarm/lib/incremental-log');

function baseManifest(swarmId = '0001-user-auth') {
  return {
    swarm_id: swarmId,
    version: 1,
    saga_id: 'sg_aaaa1111',
    mode: 'checkpoint',
    initiative: 'user-auth',
    created: '2026-06-12T17:00:00Z',
    ecosystem: 'cerebrio',
    repos: {
      'shared-types': {
        wave: 1, status: 'complete', phase_slug: 'phase-3-user-auth',
        branch: 'phase-3-user-auth', owner: 'sess-1',
        tasks_done: 7, tasks_total: 7, tokens_used: 85000, tokens_budget: 300000,
        commits: 3,
      },
      backend: {
        wave: 2, status: 'running', phase_slug: 'phase-3-user-auth',
        branch: 'phase-3-user-auth', owner: 'sess-1',
        tasks_done: 3, tasks_total: 9, tokens_used: 42000, tokens_budget: 300000,
        commits: 1, current_task: 'src/auth/middleware.ts',
      },
      frontend: {
        wave: 3, status: 'queued', phase_slug: 'phase-3-user-auth',
        branch: 'phase-3-user-auth', owner: 'sess-1',
        waiting_on: ['backend'],
      },
    },
    waves: [
      { index: 1, repos: ['shared-types'], status: 'complete' },
      { index: 2, repos: ['backend'], status: 'running' },
      { index: 3, repos: ['frontend'], status: 'queued' },
    ],
    audit: [
      { ts: '2026-06-12T17:38:00Z', actor: 'sess-1', event: 'start', detail: 'swarm started' },
      { ts: '2026-06-12T17:42:00Z', actor: 'sess-1', event: 'contract-bump', repo: 'shared-types', detail: 'contract@v2 published' },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// board.json materialization (Strategy A)
// ─────────────────────────────────────────────────────────────────────────────

test('materializeBoard — produces slim board from manifest', () => {
  const tmp = mktmp();
  try {
    const m = baseManifest();
    manifestLib.writeManifest(tmp, m.swarm_id, m);
    const board = boardLib.materializeBoard(tmp, m.swarm_id, m, '2026-06-12T17:42:11Z');

    assert.equal(board.swarm_id, m.swarm_id);
    assert.equal(board.version, 1);
    assert.equal(board.mode, 'checkpoint');
    assert.equal(board.rendered_at, '2026-06-12T17:42:11Z');
    assert.equal(board.active_wave, 2);
    assert.equal(board.status, 'running');
    assert.equal(board.inbox_count, 0);
    assert.equal(board.repos.length, 3);

    const backend = board.repos.find((r) => r.name === 'backend');
    assert.equal(backend.tasks, '3/9');
    assert.equal(backend.tokens, '42k/300k');
    assert.equal(backend.current, 'src/auth/middleware.ts');
    assert.equal(backend.commits, 1);

    const frontend = board.repos.find((r) => r.name === 'frontend');
    assert.equal(frontend.waiting_on, 'backend');

    // recent_activity is newest-first, last 10
    assert.equal(board.recent_activity.length, 2);
    assert.equal(board.recent_activity[0].msg, 'contract@v2 published');
    assert.equal(board.recent_activity[0].ts, '17:42');
    assert.equal(board.recent_activity[0].repo, 'shared-types');
  } finally {
    rmrf(tmp);
  }
});

test('materializeBoard — derives complete status when every repo done', () => {
  const tmp = mktmp();
  try {
    const m = baseManifest();
    for (const r of Object.values(m.repos)) r.status = 'complete';
    manifestLib.writeManifest(tmp, m.swarm_id, m);
    const board = boardLib.materializeBoard(tmp, m.swarm_id, m, '2026-06-12T18:00:00Z');
    assert.equal(board.status, 'complete');
  } finally {
    rmrf(tmp);
  }
});

test('materializeBoard — derives failed status when any repo failed', () => {
  const tmp = mktmp();
  try {
    const m = baseManifest();
    m.repos.backend.status = 'failed';
    manifestLib.writeManifest(tmp, m.swarm_id, m);
    const board = boardLib.materializeBoard(tmp, m.swarm_id, m, '2026-06-12T18:00:00Z');
    assert.equal(board.status, 'failed');
  } finally {
    rmrf(tmp);
  }
});

test('materializeBoard — counts inbox items from inbox/ dir', () => {
  const tmp = mktmp();
  try {
    const m = baseManifest();
    manifestLib.writeManifest(tmp, m.swarm_id, m);
    const inboxDir = path.join(manifestLib.swarmDir(tmp, m.swarm_id), 'inbox');
    fs.writeFileSync(path.join(inboxDir, '0001-token-shape.md'), '# Question\n');
    fs.writeFileSync(path.join(inboxDir, '0002-edge-case.md'), '# Question\n');
    fs.writeFileSync(path.join(inboxDir, 'INDEX.md'), '## Pending\n');
    const board = boardLib.materializeBoard(tmp, m.swarm_id, m, '2026-06-12T18:00:00Z');
    assert.equal(board.inbox_count, 2);
  } finally {
    rmrf(tmp);
  }
});

test('refreshBoard — writes board.json to disk', () => {
  const tmp = mktmp();
  try {
    const m = baseManifest();
    manifestLib.writeManifest(tmp, m.swarm_id, m);
    boardLib.refreshBoard(tmp, m.swarm_id, '2026-06-12T18:00:00Z');
    const loaded = boardLib.loadBoard(tmp, m.swarm_id);
    assert.ok(loaded);
    assert.equal(loaded.swarm_id, m.swarm_id);
    assert.equal(loaded.repos.length, 3);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Git SHA invalidation (Strategy B)
// ─────────────────────────────────────────────────────────────────────────────

function initGitRepo(dir) {
  spawnSync('git', ['init', '-q'], { cwd: dir });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: dir });
  spawnSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'README.md'), '# test\n');
  spawnSync('git', ['add', '-A'], { cwd: dir });
  spawnSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
}

test('readHeadSha — returns sha for valid git repo', () => {
  const tmp = mktmp();
  try {
    initGitRepo(tmp);
    const sha = gitSha.readHeadSha(tmp);
    assert.ok(sha);
    assert.match(sha, /^[0-9a-f]{7,40}$/);
  } finally {
    rmrf(tmp);
  }
});

test('readHeadSha — returns null for non-git dir', () => {
  const tmp = mktmp();
  try {
    assert.equal(gitSha.readHeadSha(tmp), null);
  } finally {
    rmrf(tmp);
  }
});

test('diffSinceLastSeen — distinguishes changed vs unchanged repos', () => {
  const tmp = mktmp();
  try {
    const repoA = path.join(tmp, 'a');
    const repoB = path.join(tmp, 'b');
    fs.mkdirSync(repoA, { recursive: true });
    fs.mkdirSync(repoB, { recursive: true });
    initGitRepo(repoA);
    initGitRepo(repoB);
    const shaA = gitSha.readHeadSha(repoA);
    const shaB = gitSha.readHeadSha(repoB);

    // Both seen — no change
    let diff = gitSha.diffSinceLastSeen({ a: shaA, b: shaB }, (id) => id === 'a' ? repoA : repoB);
    assert.deepEqual(diff.unchanged.sort(), ['a', 'b']);
    assert.deepEqual(diff.changed, []);

    // Mutate repo A
    fs.writeFileSync(path.join(repoA, 'NEW.md'), '# new\n');
    spawnSync('git', ['add', '-A'], { cwd: repoA });
    spawnSync('git', ['commit', '-q', '-m', 'add new'], { cwd: repoA });

    diff = gitSha.diffSinceLastSeen({ a: shaA, b: shaB }, (id) => id === 'a' ? repoA : repoB);
    assert.deepEqual(diff.changed, ['a']);
    assert.deepEqual(diff.unchanged, ['b']);
    assert.equal(diff.shas.a, gitSha.readHeadSha(repoA));
    assert.equal(diff.shas.b, shaB);
  } finally {
    rmrf(tmp);
  }
});

test('diffSinceLastSeen — treats unreadable repo as changed', () => {
  const tmp = mktmp();
  try {
    const diff = gitSha.diffSinceLastSeen(
      { ghost: 'abcdef1234567890' },
      () => path.join(tmp, 'nonexistent')
    );
    assert.deepEqual(diff.changed, ['ghost']);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Incremental log (Strategy C)
// ─────────────────────────────────────────────────────────────────────────────

test('readDelta — returns full content when no prior offset', () => {
  const tmp = mktmp();
  try {
    const file = path.join(tmp, 'session.md');
    const content = 'line 1\nline 2\n';
    fs.writeFileSync(file, content);
    const r = incLog.readDelta(file, 0);
    assert.equal(r.delta, content);
    assert.equal(r.newOffset, Buffer.byteLength(content, 'utf8'));
  } finally {
    rmrf(tmp);
  }
});

test('readDelta — returns only new bytes since offset', () => {
  const tmp = mktmp();
  try {
    const file = path.join(tmp, 'session.md');
    fs.writeFileSync(file, 'hello\n');
    const r1 = incLog.readDelta(file, 0);
    assert.equal(r1.newOffset, 6);
    fs.appendFileSync(file, 'world\n');
    const r2 = incLog.readDelta(file, r1.newOffset);
    assert.equal(r2.delta, 'world\n');
    assert.equal(r2.newOffset, 12);
  } finally {
    rmrf(tmp);
  }
});

test('readDelta — resets when file shrinks', () => {
  const tmp = mktmp();
  try {
    const file = path.join(tmp, 'session.md');
    fs.writeFileSync(file, 'long content here\n');
    fs.writeFileSync(file, 'short\n'); // truncate
    const r = incLog.readDelta(file, 50);
    assert.equal(r.delta, 'short\n');
    assert.equal(r.newOffset, 6);
  } finally {
    rmrf(tmp);
  }
});

test('readDelta — missing file returns empty', () => {
  const r = incLog.readDelta('/nonexistent/path/x.md', 0);
  assert.equal(r.delta, '');
  assert.equal(r.newOffset, 0);
});

test('readDeltaPersistent — persists offsets across calls', () => {
  const tmp = mktmp();
  try {
    const swarmId = '0001-foo';
    manifestLib.ensureSwarmLayout(tmp, swarmId);
    const file = path.join(tmp, 'session.md');
    fs.writeFileSync(file, 'one\n');

    const r1 = incLog.readDeltaPersistent(tmp, swarmId, file);
    assert.equal(r1.delta, 'one\n');
    assert.equal(r1.previousOffset, 0);

    fs.appendFileSync(file, 'two\n');
    const r2 = incLog.readDeltaPersistent(tmp, swarmId, file);
    assert.equal(r2.delta, 'two\n');
    assert.equal(r2.previousOffset, 4);
  } finally {
    rmrf(tmp);
  }
});

test('tailHistory — returns last N entries separated by ---', () => {
  const tmp = mktmp();
  try {
    const file = path.join(tmp, 'history.md');
    const body =
      'Entry 1\n---\nEntry 2\n---\nEntry 3\n---\nEntry 4\n---\nEntry 5\n';
    fs.writeFileSync(file, body);

    const last3 = incLog.tailHistory(file, 3);
    assert.deepEqual(last3, ['Entry 3', 'Entry 4', 'Entry 5']);

    const all = incLog.tailHistory(file, 100);
    assert.deepEqual(all, ['Entry 1', 'Entry 2', 'Entry 3', 'Entry 4', 'Entry 5']);
  } finally {
    rmrf(tmp);
  }
});

test('tailHistory — empty file returns []', () => {
  const tmp = mktmp();
  try {
    const file = path.join(tmp, 'history.md');
    fs.writeFileSync(file, '');
    assert.deepEqual(incLog.tailHistory(file, 5), []);
  } finally {
    rmrf(tmp);
  }
});

test('tailHistory — missing file returns []', () => {
  assert.deepEqual(incLog.tailHistory('/nonexistent', 5), []);
});
