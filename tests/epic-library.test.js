'use strict';

/**
 * Phase 32b G1 — the epic record library and `momentum epic` CLI.
 *
 * The load-bearing test is the last one in the first block: the library must
 * round-trip the hand-authored bootstrap record WITHOUT editing it. That record
 * was written before the schema existed, by a human, for a human — so where the
 * two disagree the schema is the thing that is wrong.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT, mktmp, rmrf } = require('./_helpers');

const epic = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'epic'));
const CLI = path.join(REPO_ROOT, 'bin', 'momentum.js');

const TS = '2026-07-27T10:00:00Z';

function withSpecs(fn) {
  const dir = mktmp();
  const specs = path.join(dir, 'specs');
  fs.mkdirSync(path.join(specs, 'phases'), { recursive: true });
  try { return fn(specs, dir); } finally { rmrf(dir); }
}

function writePhase(specs, name, frontmatter) {
  fs.mkdirSync(path.join(specs, 'phases', name), { recursive: true });
  fs.writeFileSync(path.join(specs, 'phases', name, 'overview.md'),
    `---\n${frontmatter}\n---\n\n# ${name}\n`, 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// The bootstrap record
// ─────────────────────────────────────────────────────────────────────────────

test('the library round-trips the hand-authored bootstrap epic', () => {
  const loaded = epic.load(path.join(REPO_ROOT, 'specs'), 'autonomous-execution');
  assert.ok(loaded, 'the bootstrap record must load — if it does not, the schema is wrong');
  assert.equal(loaded.data.id, '0001');
  assert.equal(loaded.data.type, 'Epic');
  assert.deepEqual(epic.validate(loaded.data), []);
  assert.equal(loaded.data.phases.length, 4);
});

test('epic policy keys are flat because the OKF subset excludes nested maps', () => {
  // The record originally carried a nested `policy:` block and was therefore
  // unparseable by momentum's own reader (core/lib/frontmatter.js returns
  // data:null outside the subset). Widening the OKF subset is an ADR-0005
  // decision; flattening four keys is not.
  const loaded = epic.load(path.join(REPO_ROOT, 'specs'), 'autonomous-execution');
  assert.equal(loaded.data.policy_release, 'per-feature');
  assert.equal(loaded.data.policy_tdd, 'strict');
  assert.equal(loaded.data.policy, undefined, 'a nested policy map would make the file opaque');
});

// ─────────────────────────────────────────────────────────────────────────────
// Create / list / status
// ─────────────────────────────────────────────────────────────────────────────

test('create writes a parseable record and allocates monotonic ids', () => {
  withSpecs((specs) => {
    const a = epic.create({ specsDir: specs, slug: 'attachments', objective: 'files', nowIso: TS });
    assert.equal(a.id, '0001');
    const b = epic.create({ specsDir: specs, slug: 'search', nowIso: TS });
    assert.equal(b.id, '0002');

    const loaded = epic.load(specs, 'attachments');
    assert.ok(loaded, 'a record momentum writes must be a record momentum can read');
    assert.deepEqual(epic.validate(loaded.data), []);
    assert.match(loaded.body, /## Decisions/);
    assert.match(loaded.body, /never re-asked/);
  });
});

test('create refuses to overwrite an existing epic', () => {
  withSpecs((specs) => {
    epic.create({ specsDir: specs, slug: 'attachments', nowIso: TS });
    assert.throws(() => epic.create({ specsDir: specs, slug: 'attachments', nowIso: TS }),
      /already exists — refusing to overwrite/);
  });
});

test('create rejects a malformed slug', () => {
  withSpecs((specs) => {
    for (const bad of ['Attachments', '1st', 'has space', '']) {
      assert.throws(() => epic.create({ specsDir: specs, slug: bad, nowIso: TS }), /invalid slug/);
    }
  });
});

test('load returns null for an absent epic and for one outside the OKF subset', () => {
  withSpecs((specs) => {
    assert.equal(epic.load(specs, 'nope'), null);

    fs.mkdirSync(path.join(specs, 'epics'), { recursive: true });
    fs.writeFileSync(path.join(path.join(specs, 'epics'), '0009-opaque.md'),
      '---\ntype: Epic\nnested:\n  a: 1\n---\n\nbody\n', 'utf8');
    assert.equal(epic.load(specs, 'opaque'), null,
      'a file outside the subset is opaque — momentum leaves it alone rather than guessing');
  });
});

test('validate names every structural problem', () => {
  assert.deepEqual(epic.validate(null), ['epic frontmatter is unreadable']);
  const errs = epic.validate({ type: 'Phase', id: '1', slug: 'Bad', status: 'x', phases: [] });
  assert.equal(errs.length, 5);
});

// ─────────────────────────────────────────────────────────────────────────────
// The phase graph — delegated, and honest about what it cannot order
// ─────────────────────────────────────────────────────────────────────────────

test('waves come from each phase\'s own deps, not from the epic\'s phase list', () => {
  // ADR-0003: one topological sort in the codebase. The `phases` array is a
  // membership list; ordering it would be a second sort hiding in a field that
  // merely looks ordered.
  withSpecs((specs) => {
    epic.create({ specsDir: specs, slug: 'e', phases: ['p-a', 'p-b', 'p-c'], nowIso: TS });
    // Declared order a,b,c — but deps say c must precede b.
    writePhase(specs, 'p-a', 'type: Phase\nstatus: in-progress');
    writePhase(specs, 'p-b', 'type: Phase\nstatus: in-progress\ndeps: [p-c]');
    writePhase(specs, 'p-c', 'type: Phase\nstatus: in-progress');

    const g = epic.waves(specs, 'e');
    assert.deepEqual(g.waves, [
      { index: 1, nodes: ['p-a', 'p-c'] },
      { index: 2, nodes: ['p-b'] },
    ]);
  });
});

test('an unscaffolded phase is REPORTED, never silently placed in wave 1', () => {
  // A phase with no overview.md has no deps yet. Putting it in wave 1 would
  // present a guess as a plan and silently contradict the epic's own prose
  // graph — which is exactly what happened when this was first written.
  withSpecs((specs) => {
    epic.create({ specsDir: specs, slug: 'e', phases: ['p-a', 'p-later'], nowIso: TS });
    writePhase(specs, 'p-a', 'type: Phase\nstatus: in-progress');

    const g = epic.waves(specs, 'e');
    assert.deepEqual(g.waves, [{ index: 1, nodes: ['p-a'] }]);
    assert.deepEqual(g.unscaffolded, ['p-later']);
  });
});

test('complete phases drop out of the graph', () => {
  withSpecs((specs) => {
    epic.create({ specsDir: specs, slug: 'e', phases: ['p-a', 'p-b'], nowIso: TS });
    writePhase(specs, 'p-a', 'type: Phase\nstatus: complete');
    writePhase(specs, 'p-b', 'type: Phase\nstatus: in-progress\ndeps: [p-a]');

    const g = epic.waves(specs, 'e');
    assert.deepEqual(g.complete, ['p-a']);
    assert.deepEqual(g.waves, [{ index: 1, nodes: ['p-b'] }]);
  });
});

test('deps pointing outside the epic are ignored, not treated as blockers', () => {
  withSpecs((specs) => {
    epic.create({ specsDir: specs, slug: 'e', phases: ['p-a'], nowIso: TS });
    writePhase(specs, 'p-a', 'type: Phase\nstatus: in-progress\ndeps: [some-other-lane]');
    assert.deepEqual(epic.waves(specs, 'e').waves, [{ index: 1, nodes: ['p-a'] }]);
  });
});

test('setStatus closes an epic and stamps the date', () => {
  withSpecs((specs) => {
    epic.create({ specsDir: specs, slug: 'e', phases: ['p'], nowIso: TS });
    epic.setStatus(specs, 'e', 'complete', TS);
    const loaded = epic.load(specs, 'e');
    assert.equal(loaded.data.status, 'complete');
    assert.equal(loaded.data.closed, TS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

test('momentum epic is dispatched and documented', () => {
  const help = spawnSync('node', [CLI, '--help'], { encoding: 'utf8' }).stdout;
  assert.match(help, /momentum epic create <slug>/);
});

test('momentum epic status renders the wave plan and names unscaffolded phases', () => {
  const r = spawnSync('node', [CLI, 'epic', 'status', 'autonomous-execution'],
    { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Epic 0001 — autonomous-execution/);
  assert.match(r.stdout, /Wave 1: phase-32a-governor/);
  assert.match(r.stdout, /Not yet scaffolded \(2\)/);
  assert.match(r.stdout, /no overview\.md, so no deps to order by/);
});

test('momentum epic status fails clearly on an unknown slug', () => {
  const r = spawnSync('node', [CLI, 'epic', 'status', 'nope'], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no epic "nope"/);
});

test('momentum epic list shows the bootstrap epic', () => {
  const r = spawnSync('node', [CLI, 'epic', 'list'], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /0001\s+autonomous-execution/);
});
