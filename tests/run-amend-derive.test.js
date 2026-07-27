'use strict';

/**
 * Phase 32b G3 — the amendments channel (D11) and just-in-time derivation (D10).
 *
 * These two exist because of the same operator objection. They asked what
 * happens when, after phase 1, they observe something and want to change a
 * decision. Amendments are the channel; derivation is what makes the answer
 * cheap — a not-yet-written spec absorbs a change for free, while an
 * already-written one turns every correction into a merge conflict.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT, mktmp, rmrf } = require('./_helpers');

const amend = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'amend'));
const derive = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'derive'));
const manifestLib = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'manifest'));

const CLI = path.join(REPO_ROOT, 'bin', 'momentum.js');
const TS = '2026-07-27T10:00:00Z';

function withRun(fn) {
  const dir = mktmp();
  manifestLib.create({
    repoRoot: dir, tier: 'epic', target: 'autonomous-execution', unit: 'G0', nowIso: TS,
  });
  try { return fn(dir); } finally { rmrf(dir); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification — the safe direction wins
// ─────────────────────────────────────────────────────────────────────────────

test('an explicit forward-only amendment is forward-only', () => {
  const v = amend.classify({ text: 'use GCS for later phases', forwardOnly: true });
  assert.equal(v.kind, amend.KIND.FORWARD_ONLY);
  assert.equal(v.stops, false);
});

test('naming affected work is itself the backward signal', () => {
  // An operator who can name a unit has already decided the answer.
  const v = amend.classify({ text: 'actually use GCS', invalidates: ['G1'] });
  assert.equal(v.kind, amend.KIND.BACKWARD_INVALIDATING);
  assert.deepEqual(v.invalidates, ['G1']);
  assert.equal(v.stops, true);
});

test('NO SIGNAL is treated as invalidating, not as forward-only', () => {
  // D11 is silent on the ambiguous case, and silence would default to the cheap
  // branch — absorbing a change that may invalidate completed work. The failure
  // mode we want is an unnecessary stop.
  const v = amend.classify({ text: 'switch storage backends' }, { completedUnits: ['G0', 'G1'] });
  assert.equal(v.kind, amend.KIND.UNCLASSIFIED);
  assert.equal(v.stops, true);
  assert.deepEqual(v.invalidates, ['G0', 'G1'],
    'the operator needs something concrete to adjudicate, not an abstract warning');
});

test('forwardOnly does not override explicitly named units', () => {
  const v = amend.classify({ text: 'x', forwardOnly: true, invalidates: ['G1'] });
  assert.equal(v.kind, amend.KIND.BACKWARD_INVALIDATING);
});

test('classify is pure', () => {
  const a = { text: 'x', forwardOnly: true };
  assert.deepEqual(amend.classify(a), amend.classify(a));
});

// ─────────────────────────────────────────────────────────────────────────────
// Applying an amendment to a live run
// ─────────────────────────────────────────────────────────────────────────────

test('a forward-only amendment is absorbed with ZERO effect on the run', () => {
  // The operator's actual requirement: change something mid-run without
  // stopping everything.
  withRun((dir) => {
    const r = amend.apply(dir, { text: 'use GCS from here on', forwardOnly: true }, TS);
    assert.equal(r.stopped, false);
    assert.match(r.message, /absorbed/);

    const m = manifestLib.load(dir);
    assert.equal(m.status, 'running', 'the run must keep going');
    assert.equal(m.amendments.length, 1);
    assert.equal(m.amendments[0].kind, 'forward-only');
  });
});

test('a backward-invalidating amendment stops the run and names the work', () => {
  withRun((dir) => {
    manifestLib.advance(dir, 'G1', TS);
    const r = amend.apply(dir, { text: 'actually use GCS', invalidates: ['G0'] }, TS);

    assert.equal(r.stopped, true);
    assert.deepEqual(r.invalidates, ['G0']);
    assert.equal(manifestLib.load(dir).status, 'stopped');
  });
});

test('an unsignalled amendment stops, and says why it stopped', () => {
  withRun((dir) => {
    manifestLib.advance(dir, 'G1', TS);
    const r = amend.apply(dir, { text: 'switch backends' }, TS);
    assert.equal(r.stopped, true);
    assert.match(r.message, /no forward-only signal/);
  });
});

test('completed units are read from the audit trail, not guessed', () => {
  // Asserted through the PUBLIC surface: an unsignalled amendment reports the
  // completed units it might invalidate, so this proves the same thing without
  // exporting an internal helper "for tests".
  withRun((dir) => {
    manifestLib.advance(dir, 'G1', TS);
    manifestLib.advance(dir, 'G2', TS);
    manifestLib.recordTurn(dir, TS); // a turn counter must not be mistaken for a unit

    const r = amend.apply(dir, { text: 'switch backends' }, TS);
    assert.deepEqual(r.invalidates, ['G1'],
      'the CURRENT unit is not complete; turn counters are not units');
  });
});

test('only forward-only amendments feed later derivations', () => {
  // A backward-invalidating amendment stopped the run — whatever happens next is
  // the operator's call, not a derivation input.
  withRun((dir) => {
    amend.apply(dir, { text: 'forward one', forwardOnly: true }, TS);
    amend.apply(dir, { text: 'backward one', invalidates: ['G0'] }, TS);

    const fwd = amend.forwardAmendments(manifestLib.load(dir));
    assert.equal(fwd.length, 1);
    assert.equal(fwd[0].text, 'forward one');
  });
});

test('amending with no run is an error, not a crash', () => {
  const dir = mktmp();
  try {
    assert.equal(amend.apply(dir, { text: 'x', forwardOnly: true }, TS).ok, false);
  } finally { rmrf(dir); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Derivation
// ─────────────────────────────────────────────────────────────────────────────

const EPIC = Object.freeze({
  id: '0001', slug: 'autonomous-execution', status: 'in-progress',
  policy_release: 'per-feature', policy_push: 'per-phase', policy_tdd: 'strict',
});

function deriveArgs(over = {}) {
  return Object.assign({
    epic: EPIC, epicSlug: 'autonomous-execution', phase: 'phase-32c-adapter-parity',
    deps: ['phase-32a-governor'], decisions: ['D2 — two governor backends'],
    amendments: [], deferred: [], date: '2026-07-27',
  }, over);
}

test('derivation is reproducible — same inputs, byte-identical output', () => {
  // A derivation that varied run-to-run could not be reviewed, diffed or
  // trusted. This is why the date is supplied rather than read from a clock.
  const a = derive.derive(deriveArgs());
  const b = derive.derive(deriveArgs());
  assert.equal(a.overview, b.overview);
  assert.equal(a.plan, b.plan);
  assert.equal(a.tasks, b.tasks);
});

test('the derived spec says it was derived, and points at its source', () => {
  const out = derive.derive(deriveArgs());
  assert.match(out.overview, /Derived, not brainstormed/);
  assert.match(out.overview, /specs\/epics\/0001-autonomous-execution\.md/);
  assert.match(out.overview, /no\n> operator interview/);
  assert.match(out.overview, /Decisions are durable;/);
});

test('inherited decisions appear; they are not re-litigated', () => {
  const out = derive.derive(deriveArgs());
  assert.match(out.overview, /## Inherited decisions/);
  assert.match(out.overview, /D2 — two governor backends/);
  assert.match(out.overview, /Never re-asked/);
});

test('forward-only amendments become inputs to the derived spec', () => {
  // This is the payoff of D10 over upfront authoring, and the test that proves
  // the operator's correction actually reaches the later phase.
  const out = derive.derive(deriveArgs({
    amendments: [{ ts: '2026-07-28T09:00:00Z', text: 'prefer GCS over S3' }],
  }));
  assert.match(out.overview, /## Operator amendments since the epic was written/);
  assert.match(out.overview, /2026-07-28 — prefer GCS over S3/);
  assert.match(out.overview, /would be a merge\n> conflict/);
});

test('deps and run policy are carried into the derived spec', () => {
  const out = derive.derive(deriveArgs());
  assert.match(out.overview, /deps: \[phase-32a-governor\]/);
  assert.match(out.overview, /release: per-feature/);
  assert.match(out.plan, /Depends on: phase-32a-governor/);
});

test('tdd: strict is enforced in the derived tasks file', () => {
  const strict = derive.derive(deriveArgs());
  assert.match(strict.tasks, /no task may be marked `\[x\]` without a recorded red→green/);

  const optIn = derive.derive(deriveArgs({
    epic: Object.assign({}, EPIC, { policy_tdd: 'opt-in' }),
  }));
  assert.ok(!/red→green/.test(optIn.tasks));
});

test('the plan admits what derivation CANNOT know', () => {
  // The group breakdown depends on code that exists now and did not when the
  // epic was written. Pretending otherwise would be the upfront-specs mistake
  // in miniature.
  const out = derive.derive(deriveArgs());
  assert.match(out.plan, /the one thing the epic CANNOT know/);
});

test('a phase with no deps says so rather than leaving it blank', () => {
  const out = derive.derive(deriveArgs({ deps: [] }));
  assert.match(out.plan, /No dependencies — this phase can start immediately/);
});

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

test('momentum run amend refuses without text and explains the default', () => {
  const r = spawnSync('node', [CLI, 'run', 'amend'], { cwd: mktmp(), encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /treated as invalidating/);
});

test('momentum run amend --forward-only leaves the run running', () => {
  withRun((dir) => {
    const r = spawnSync('node', [CLI, 'run', 'amend', 'prefer GCS', '--forward-only'],
      { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /forward-only/);
    assert.equal(manifestLib.load(dir).status, 'running');
  });
});

test('momentum run amend --invalidates stops and lists the affected units', () => {
  withRun((dir) => {
    spawnSync('node', [CLI, 'run', 'advance', 'G1'], { cwd: dir, encoding: 'utf8' });
    const r = spawnSync('node', [CLI, 'run', 'amend', 'use GCS', '--invalidates', 'G0'],
      { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Affected completed work:/);
    assert.match(r.stdout, /- G0/);
    assert.equal(manifestLib.load(dir).status, 'stopped');
  });
});

test('momentum run derive emits a spec without an interview', () => {
  const r = spawnSync('node',
    [CLI, 'run', 'derive', 'phase-32c-adapter-parity', '--epic', 'autonomous-execution',
      '--deps', 'phase-32a-governor', '--date', '2026-07-27'],
    { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Derived, not brainstormed/);
  assert.match(r.stdout, /dry run — pass --write/);
});
