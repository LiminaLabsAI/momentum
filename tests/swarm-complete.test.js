'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');
const conductor = require('../core/swarm/conductor');
const manifestLib = require('../core/swarm/lib/manifest');
const boardLib = require('../core/swarm/lib/board');

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
  for (const m of eco.members) fs.mkdirSync(path.join(tmp, m.path), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'initiatives'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'initiatives', '0001-foo.md'),
    '---\nid: 1\nslug: foo\nstatus: in-progress\nstarted: 2026-06-12\nowner: test\nrepos: [a, b]\n---\n\n# Foo\n',
  );
  const manifest = conductor.planSwarm({
    ecosystemRoot: tmp, swarmId: '0001-foo', initiative: 'foo',
    impactedRepos: ['a', 'b'], phaseSlug: 'phase-1-foo',
    sessionId: 'sess', mode: 'autopilot',
    nowIso: '2026-06-12T17:00:00Z', ecosystemManifest: eco,
  });
  manifestLib.writeManifest(tmp, '0001-foo', manifest);
  boardLib.refreshBoard(tmp, '0001-foo', '2026-06-12T17:00:00Z');
}

test('CLI complete — writes <eco>/changes/<id>.md', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    // Drive all repos to complete
    conductor.recordRepoComplete(tmp, '0001-foo', 'a', { tasksDone: 5, tasksTotal: 5, commits: 2 });
    conductor.recordRepoComplete(tmp, '0001-foo', 'b', { tasksDone: 8, tasksTotal: 8, commits: 3 });

    const r = runCli(['swarm', 'complete', '0001-foo', '--ecosystem', tmp], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /complete/);

    const changesetPath = path.join(tmp, 'changes', '0001-foo.md');
    assert.ok(fs.existsSync(changesetPath));
    const body = fs.readFileSync(changesetPath, 'utf8');
    assert.match(body, /# Swarm 0001-foo/);
    assert.match(body, /Per-repo contributions/);
    assert.match(body, /### a/);
    assert.match(body, /### b/);
    assert.match(body, /Tasks: 5\/5/);
    assert.match(body, /Tasks: 8\/8/);

    const manifest = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(manifest.status, 'complete');
    assert.ok(manifest.audit.some((a) => a.event === 'complete'));
  } finally {
    rmrf(tmp);
  }
});

test('CLI complete — partial completion stays running', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    conductor.recordRepoComplete(tmp, '0001-foo', 'a', { tasksDone: 5, tasksTotal: 5 });
    // b still queued

    const r = runCli(['swarm', 'complete', '0001-foo', '--ecosystem', tmp], { cwd: tmp });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Repos done: 1\/2/);
    const manifest = manifestLib.loadManifest(tmp, '0001-foo');
    assert.notEqual(manifest.status, 'complete', 'still running because b not done');
  } finally {
    rmrf(tmp);
  }
});

test('CLI preview-merge — runs against all repos in swarm', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const r = runCli(['swarm', 'preview-merge', '0001-foo', '--ecosystem', tmp, '--json'], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.length, 2);
    // Repos aren't git-initialized in this fixture → not git repo error per entry
    for (const entry of out) {
      assert.equal(entry.result.ok, false);
      assert.match(entry.result.summary, /not a git repo/);
    }
  } finally {
    rmrf(tmp);
  }
});
