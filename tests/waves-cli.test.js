'use strict';

/**
 * Phase 21c G2 — dependency annotations + `momentum waves` CLI
 * (core/waves/lib/plan-graph.js + bin/waves.js, ADR-0003 §3-4).
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, runCli, REPO_ROOT } = require('./_helpers');

const graphs = require(path.join(REPO_ROOT, 'core', 'waves', 'lib', 'plan-graph'));

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

function makeRepo(branch = 'main') {
  const dir = mktmp('momentum-waves-cli-');
  git(dir, 'init', '-q', '-b', branch);
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 'T');
  git(dir, 'config', 'commit.gpgsign', 'false');
  write(path.join(dir, 'README.md'), 'fixture\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--no-verify', '-m', 'init');
  return dir;
}

const TASKS_MD = `# Tasks

## Group 0 — Scaffold
- [x] a
- [x] b

## Group 1 — Engine (deps: G0)
- [ ] build it

## Group 2 — CLI (deps: G0, G1)
- [ ] wire it

## Group 3 — Docs (deps: G1)
- [ ] write it
`;

test('parseTaskGroups reads ids, deps suffix, and satisfaction from checkboxes', () => {
  const groups = graphs.parseTaskGroups(TASKS_MD);
  assert.deepEqual(groups.map((g) => g.id), ['G0', 'G1', 'G2', 'G3']);
  assert.deepEqual(groups[2].deps, ['G0', 'G1']);
  assert.equal(groups[0].satisfied, true, 'all-[x] group satisfied');
  assert.equal(groups[1].satisfied, false);
  assert.equal(groups[1].title, 'Engine');
});

test('waves --tasks <path>: satisfied groups drop, remaining layer correctly', () => {
  const dir = makeRepo();
  try {
    write(path.join(dir, 'plan', 'tasks.md'), TASKS_MD);
    const res = runCli(['waves', '--tasks', 'plan/tasks.md'], { cwd: dir });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /\(satisfied, dropped: G0\)/);
    assert.match(res.stdout, /wave 1: G1/);
    assert.match(res.stdout, /wave 2: G2 {2}G3|wave 2: G2 +G3/);
  } finally {
    rmrf(dir);
  }
});

test('waves --tasks defaults to the phase bound to the current branch (Rule 15)', () => {
  const dir = makeRepo('phase-9-demo');
  try {
    write(path.join(dir, 'specs', 'phases', 'phase-9-demo', 'tasks.md'), TASKS_MD);
    const res = runCli(['waves', '--tasks'], { cwd: dir });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /task-group waves for phase-9-demo:/);
    assert.match(res.stdout, /wave 1: G1/);
  } finally {
    rmrf(dir);
  }
});

test('phase scale: index.json deps layer phases; complete phases are satisfied; lane suggestions printed', () => {
  const dir = makeRepo();
  try {
    write(path.join(dir, 'specs', 'phases', 'index.json'), JSON.stringify({
      version: 1,
      phases: {
        'phase-a-auth': { status: 'in-progress', topics: [] },
        'phase-b-api': { status: 'planned', topics: [], deps: ['phase-d-done'] },
        'phase-c-ui': { status: 'planned', topics: [], deps: ['phase-a-auth', 'phase-b-api'] },
        'phase-d-done': { status: 'complete', topics: [] },
      },
    }, null, 2));
    const res = runCli(['waves'], { cwd: dir });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /wave 1: phase-a-auth {2}phase-b-api|wave 1: phase-a-auth +phase-b-api/);
    assert.match(res.stdout, /wave 2: phase-c-ui/);
    assert.match(res.stdout, /momentum lanes open phase-a-auth/);
    assert.doesNotMatch(res.stdout, /phase-d-done/, 'complete phases are not scheduled');
  } finally {
    rmrf(dir);
  }
});

test('cycles report participants; --json is marked unstable; errors exit 1', () => {
  const dir = makeRepo();
  try {
    write(path.join(dir, 'specs', 'phases', 'index.json'), JSON.stringify({
      version: 1,
      phases: {
        'phase-x': { status: 'planned', deps: ['phase-y'] },
        'phase-y': { status: 'planned', deps: ['phase-x'] },
      },
    }));
    const cyc = runCli(['waves'], { cwd: dir });
    assert.equal(cyc.status, 1);
    assert.match(cyc.stderr, /cycle detected involving phase-x, phase-y/);

    write(path.join(dir, 'plan.md'), TASKS_MD);
    const j = runCli(['waves', '--tasks', 'plan.md', '--json'], { cwd: dir });
    assert.equal(j.status, 0, j.stderr);
    const parsed = JSON.parse(j.stdout.slice(j.stdout.indexOf('{')));
    assert.equal(parsed.unstable, true);
    assert.equal(parsed.waves[0].nodes[0], 'G1');

    const bad = runCli(['waves', '--tasks', 'nope-not-here'], { cwd: dir });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /cannot resolve 'nope-not-here'/);
  } finally {
    rmrf(dir);
  }
});
