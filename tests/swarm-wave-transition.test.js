'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { mktmp, rmrf } = require('./_helpers');
const conductor = require('../core/swarm/conductor');
const manifestLib = require('../core/swarm/lib/manifest');
const boardLib = require('../core/swarm/lib/board');
const preMergeLib = require('../core/swarm/lib/pre-merge');

function gitInit(dir, content = '# initial\n') {
  spawnSync('git', ['init', '-q'], { cwd: dir });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  spawnSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'README.md'), content);
  spawnSync('git', ['add', '-A'], { cwd: dir });
  spawnSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
  // Rename default branch to main for predictability
  spawnSync('git', ['branch', '-M', 'main'], { cwd: dir });
}

function setupFullSwarm(tmp, mode = 'checkpoint') {
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
    const repoPath = path.join(tmp, m.path);
    fs.mkdirSync(repoPath, { recursive: true });
    gitInit(repoPath);
  }
  fs.mkdirSync(path.join(tmp, 'initiatives'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'initiatives', '0001-foo.md'),
    '---\nid: 1\nslug: foo\nstatus: in-progress\nstarted: 2026-06-12\nowner: test\nrepos: [a, b]\n---\n\n# Foo\n',
  );
  const manifest = conductor.planSwarm({
    ecosystemRoot: tmp, swarmId: '0001-foo', initiative: 'foo',
    impactedRepos: ['a', 'b'], phaseSlug: 'phase-1-foo',
    sessionId: 'sess', mode,
    nowIso: '2026-06-12T17:00:00Z', ecosystemManifest: eco,
  });
  manifestLib.writeManifest(tmp, '0001-foo', manifest);
  boardLib.refreshBoard(tmp, '0001-foo', '2026-06-12T17:00:00Z');
}

// ─────────────────────────────────────────────────────────────────────────────
// Wave checkpoint flow (autopilot auto-advances; checkpoint waits)
// ─────────────────────────────────────────────────────────────────────────────

test('wave transition — autopilot mode auto-advances', () => {
  const tmp = mktmp();
  try {
    setupFullSwarm(tmp, 'autopilot');
    conductor.pollTurn({ ecosystemRoot: tmp, swarmId: '0001-foo', nowIso: '2026-06-12T17:00:01Z' });
    conductor.recordRepoComplete(tmp, '0001-foo', 'a', { tasksDone: 5, tasksTotal: 5, commits: 2 });

    const r = conductor.pollTurn({ ecosystemRoot: tmp, swarmId: '0001-foo', nowIso: '2026-06-12T17:05:00Z' });
    assert.equal(r.completedWave, 1);
    assert.equal(r.advancedToWave, 2);

    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(after.waves[0].status, 'complete');
    assert.equal(after.waves[1].status, 'running');
    assert.equal(after.repos.b.status, 'running');

    const auditTransition = after.audit.filter((a) => a.event === 'wave-transition');
    assert.equal(auditTransition.length, 1);
  } finally {
    rmrf(tmp);
  }
});

test('wave transition — checkpoint mode marks complete and stops', () => {
  const tmp = mktmp();
  try {
    setupFullSwarm(tmp, 'checkpoint');
    conductor.pollTurn({ ecosystemRoot: tmp, swarmId: '0001-foo', nowIso: '2026-06-12T17:00:01Z' });
    conductor.recordRepoComplete(tmp, '0001-foo', 'a', { tasksDone: 5, tasksTotal: 5 });
    const r = conductor.pollTurn({ ecosystemRoot: tmp, swarmId: '0001-foo', nowIso: '2026-06-12T17:05:00Z' });
    assert.equal(r.completedWave, 1);
    assert.equal(r.advancedToWave, null);
    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(after.waves[1].status, 'queued', 'wave 2 still queued');
    assert.equal(after.repos.b.status, 'queued');
  } finally {
    rmrf(tmp);
  }
});

test('wave transition — full autopilot run completes the swarm', () => {
  const tmp = mktmp();
  try {
    setupFullSwarm(tmp, 'autopilot');
    // Tick: start wave 1
    conductor.pollTurn({ ecosystemRoot: tmp, swarmId: '0001-foo', nowIso: '2026-06-12T17:00:01Z' });
    // Repo a done → advance to wave 2
    conductor.recordRepoComplete(tmp, '0001-foo', 'a', { tasksDone: 5, tasksTotal: 5 });
    conductor.pollTurn({ ecosystemRoot: tmp, swarmId: '0001-foo', nowIso: '2026-06-12T17:05:00Z' });
    // Repo b done → final wave complete → swarm complete
    conductor.recordRepoComplete(tmp, '0001-foo', 'b', { tasksDone: 9, tasksTotal: 9 });
    const r = conductor.pollTurn({ ecosystemRoot: tmp, swarmId: '0001-foo', nowIso: '2026-06-12T17:10:00Z' });
    assert.equal(r.completedWave, 2);

    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(after.status, 'complete');
    assert.equal(after.waves[1].status, 'complete');
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// pre-merge preview
// ─────────────────────────────────────────────────────────────────────────────

test('previewMerge — clean merge returns ok=true', () => {
  const tmp = mktmp();
  try {
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    gitInit(repo);
    // Create a feature branch with a non-conflicting change
    spawnSync('git', ['checkout', '-b', 'feat/x'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'NEW.md'), '# new\n');
    spawnSync('git', ['add', '-A'], { cwd: repo });
    spawnSync('git', ['commit', '-q', '-m', 'add new'], { cwd: repo });
    spawnSync('git', ['checkout', 'main'], { cwd: repo });

    const r = preMergeLib.previewMerge({ baseRepoPath: repo, sourceBranch: 'feat/x' });
    assert.equal(r.ok, true);
    assert.deepEqual(r.conflictedFiles, []);

    // Working tree should be clean after preview
    const status = spawnSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' });
    assert.equal(status.stdout.trim(), '');
  } finally {
    rmrf(tmp);
  }
});

test('previewMerge — conflict surfaces conflicted file', () => {
  const tmp = mktmp();
  try {
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    gitInit(repo, '# initial\nline A\n');

    // Branch with one change
    spawnSync('git', ['checkout', '-b', 'feat/x'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'README.md'), '# initial\nfeat-x changed\n');
    spawnSync('git', ['add', '-A'], { cwd: repo });
    spawnSync('git', ['commit', '-q', '-m', 'feat'], { cwd: repo });

    // Main with a competing change to the same line
    spawnSync('git', ['checkout', 'main'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'README.md'), '# initial\nmain changed\n');
    spawnSync('git', ['add', '-A'], { cwd: repo });
    spawnSync('git', ['commit', '-q', '-m', 'main'], { cwd: repo });

    const r = preMergeLib.previewMerge({ baseRepoPath: repo, sourceBranch: 'feat/x' });
    assert.equal(r.ok, false);
    assert.deepEqual(r.conflictedFiles, ['README.md']);
    // Cleanup must happen
    const status = spawnSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' });
    assert.equal(status.stdout.trim(), '');
  } finally {
    rmrf(tmp);
  }
});

test('previewMerge — non-git path errors cleanly', () => {
  const tmp = mktmp();
  try {
    const r = preMergeLib.previewMerge({ baseRepoPath: tmp, sourceBranch: 'feat/x' });
    assert.equal(r.ok, false);
    assert.match(r.error, /not a git repo/);
  } finally {
    rmrf(tmp);
  }
});

test('previewMerge — missing source branch errors cleanly', () => {
  const tmp = mktmp();
  try {
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    gitInit(repo);
    const r = preMergeLib.previewMerge({ baseRepoPath: repo, sourceBranch: 'feat/ghost' });
    assert.equal(r.ok, false);
    assert.match(r.summary, /not found/);
  } finally {
    rmrf(tmp);
  }
});

test('previewMergeBatch — runs preview per entry', () => {
  const tmp = mktmp();
  try {
    const repoA = path.join(tmp, 'a');
    const repoB = path.join(tmp, 'b');
    fs.mkdirSync(repoA);
    fs.mkdirSync(repoB);
    gitInit(repoA);
    gitInit(repoB);
    spawnSync('git', ['checkout', '-b', 'phase-1-foo'], { cwd: repoA });
    fs.writeFileSync(path.join(repoA, 'A.md'), '# A\n');
    spawnSync('git', ['add', '-A'], { cwd: repoA });
    spawnSync('git', ['commit', '-q', '-m', 'A'], { cwd: repoA });
    spawnSync('git', ['checkout', 'main'], { cwd: repoA });
    spawnSync('git', ['checkout', '-b', 'phase-1-foo'], { cwd: repoB });
    fs.writeFileSync(path.join(repoB, 'B.md'), '# B\n');
    spawnSync('git', ['add', '-A'], { cwd: repoB });
    spawnSync('git', ['commit', '-q', '-m', 'B'], { cwd: repoB });
    spawnSync('git', ['checkout', 'main'], { cwd: repoB });

    const out = preMergeLib.previewMergeBatch([
      { repo: 'a', repoPath: repoA, branch: 'phase-1-foo', intoBranch: 'main' },
      { repo: 'b', repoPath: repoB, branch: 'phase-1-foo', intoBranch: 'main' },
    ]);
    assert.equal(out.length, 2);
    assert.equal(out[0].repo, 'a');
    assert.equal(out[0].result.ok, true);
    assert.equal(out[1].result.ok, true);
  } finally {
    rmrf(tmp);
  }
});
