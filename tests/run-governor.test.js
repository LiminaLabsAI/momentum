'use strict';

/**
 * Phase 32a G3 — the governor's decision function, run-manifest CRUD, and the
 * interceptor backend's fail-open behaviour.
 *
 * The branch ORDER is load-bearing and is tested as such: a kill switch that
 * ranks below anything else is not a kill switch, and a run that can loop
 * without reaching its budget is the pre-mortem's first failure mode.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT, mktmp, rmrf } = require('./_helpers');

const governor = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'governor'));
const manifestLib = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'manifest'));
const { ACTION, STOP_REASON } = governor;

const TS = '2026-07-27T10:00:00Z';

function runningManifest(over = {}) {
  return Object.assign({
    schema_version: 1,
    run_id: 'run_abcd1234',
    tier: 'phase',
    target: 'phase-32a-governor',
    status: 'running',
    policy: { release: 'per-feature', push: 'per-phase', tdd: 'strict' },
    cursor: { unit: 'G3', started: TS, path: ['phase-32a-governor', 'G3'] },
    decisions: [],
    parked: [],
    strikes: {},
    spent: { turns: 0, tokens: 0 },
    created: TS,
    audit: [],
  }, over);
}

function withTmp(fn) {
  const dir = mktmp();
  try { return fn(dir); } finally { rmrf(dir); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Branch 1 — no run. The invariance guarantee.
// ─────────────────────────────────────────────────────────────────────────────

test('no manifest allows the stop — a repo with no run is untouched', () => {
  for (const m of [null, undefined, 'nonsense', 42]) {
    const d = governor.decide({ manifest: m, killSwitch: false });
    assert.equal(d.action, ACTION.ALLOW_STOP);
    assert.equal(d.reason, STOP_REASON.NO_RUN);
  }
});

test('a non-running status allows the stop', () => {
  for (const status of ['parked', 'stopped', 'complete', 'failed']) {
    const d = governor.decide({ manifest: runningManifest({ status }), killSwitch: false });
    assert.equal(d.action, ACTION.ALLOW_STOP);
    assert.equal(d.reason, STOP_REASON.NOT_RUNNING);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Branch 2 — the kill switch, and its rank
// ─────────────────────────────────────────────────────────────────────────────

test('the kill switch stops a healthy run', () => {
  const d = governor.decide({ manifest: runningManifest(), killSwitch: true });
  assert.equal(d.action, ACTION.ALLOW_STOP);
  assert.equal(d.reason, STOP_REASON.KILL_SWITCH);
});

test('the kill switch outranks every other continue condition', () => {
  // The agent is the thing that may be misbehaving. If any branch could
  // preempt the kill switch, a runaway could reach a state where it cannot be
  // stopped — so this asserts rank, not just effect.
  const m = runningManifest({
    spent: { turns: 0, tokens: 0 },
    budget: { turns: 1000 },
    strikes: {},
    parked: [],
  });
  const d = governor.decide({ manifest: m, killSwitch: true, hardGate: false });
  assert.equal(d.reason, STOP_REASON.KILL_SWITCH);
});

// ─────────────────────────────────────────────────────────────────────────────
// Branch 3 — budget
// ─────────────────────────────────────────────────────────────────────────────

test('an exhausted turn budget stops the run', () => {
  const m = runningManifest({ budget: { turns: 10 }, spent: { turns: 10, tokens: 0 } });
  const d = governor.decide({ manifest: m, killSwitch: false });
  assert.equal(d.reason, STOP_REASON.BUDGET_TURNS);
  assert.match(d.detail, /10\/10 turns/);
});

test('an exhausted token budget stops the run', () => {
  const m = runningManifest({ budget: { tokens: 500 }, spent: { turns: 1, tokens: 500 } });
  assert.equal(governor.decide({ manifest: m, killSwitch: false }).reason, STOP_REASON.BUDGET_TOKENS);
});

test('an exhausted wall-clock budget stops the run', () => {
  const m = runningManifest({ budget: { wall_clock_minutes: 60 }, created: '2026-07-27T10:00:00Z' });
  const later = governor.decide({ manifest: m, killSwitch: false, now: '2026-07-27T11:30:00Z' });
  assert.equal(later.reason, STOP_REASON.BUDGET_WALL_CLOCK);

  const earlier = governor.decide({ manifest: m, killSwitch: false, now: '2026-07-27T10:30:00Z' });
  assert.equal(earlier.action, ACTION.CONTINUE);
});

test('an absent budget means unbounded, not zero', () => {
  const d = governor.decide({ manifest: runningManifest(), killSwitch: false, now: TS });
  assert.equal(d.action, ACTION.CONTINUE);
});

// ─────────────────────────────────────────────────────────────────────────────
// Branch 4 — strikes
// ─────────────────────────────────────────────────────────────────────────────

test('the strike limit halts a thrashing unit instead of looping', () => {
  const m = runningManifest({ strikes: { G3: 3 } });
  const d = governor.decide({ manifest: m, killSwitch: false });
  assert.equal(d.reason, STOP_REASON.STRIKES);
  assert.match(d.detail, /G3: 3\/3/);
});

test('strikes on a different unit do not stop the current one', () => {
  const m = runningManifest({ strikes: { G1: 99 } });
  assert.equal(governor.decide({ manifest: m, killSwitch: false }).action, ACTION.CONTINUE);
});

test('the strike limit is configurable per run', () => {
  const m = runningManifest({
    strikes: { G3: 2 },
    policy: { release: 'per-phase', push: 'per-phase', tdd: 'strict', strike_limit: 2 },
  });
  assert.equal(governor.decide({ manifest: m, killSwitch: false }).reason, STOP_REASON.STRIKES);
});

// ─────────────────────────────────────────────────────────────────────────────
// Branches 5 + 6 — hard gate, parked threshold
// ─────────────────────────────────────────────────────────────────────────────

test('a hard gate stops for the one question the operator must answer', () => {
  const d = governor.decide({
    manifest: runningManifest(), killSwitch: false,
    hardGate: true, hardGateDetail: 'release v0.43.0',
  });
  assert.equal(d.reason, STOP_REASON.HARD_GATE);
  assert.equal(d.detail, 'release v0.43.0');
});

test('too many parked questions stops cleanly rather than limping', () => {
  const parked = Array.from({ length: 5 }, (_, i) => ({
    id: `p${i}`, question: 'q', blocked_unit: `u${i}`, resolved: false,
  }));
  const d = governor.decide({ manifest: runningManifest({ parked }), killSwitch: false });
  assert.equal(d.reason, STOP_REASON.PARKED_THRESHOLD);
  assert.match(d.detail, /5 unresolved/);
});

test('resolved parks do not count toward the threshold', () => {
  const parked = Array.from({ length: 9 }, (_, i) => ({
    id: `p${i}`, question: 'q', blocked_unit: `u${i}`, resolved: true,
  }));
  assert.equal(governor.decide({ manifest: runningManifest({ parked }), killSwitch: false }).action,
    ACTION.CONTINUE);
});

test('parking below the threshold does NOT stop the run — parks are non-blocking', () => {
  const parked = [{ id: 'p1', question: 'q', blocked_unit: 'G9', resolved: false }];
  assert.equal(governor.decide({ manifest: runningManifest({ parked }), killSwitch: false }).action,
    ACTION.CONTINUE);
});

// ─────────────────────────────────────────────────────────────────────────────
// Branch 7 — continue
// ─────────────────────────────────────────────────────────────────────────────

test('a healthy run continues and carries the cursor', () => {
  const d = governor.decide({ manifest: runningManifest(), killSwitch: false, now: TS });
  assert.equal(d.action, ACTION.CONTINUE);
  assert.equal(d.next.unit, 'G3');
});

test('decide is pure — no I/O, no clock, same input same output', () => {
  const m = runningManifest();
  assert.deepEqual(
    governor.decide({ manifest: m, killSwitch: false, now: TS }),
    governor.decide({ manifest: m, killSwitch: false, now: TS })
  );
});

test('every stop reason explains itself in one line', () => {
  for (const reason of Object.values(STOP_REASON)) {
    const text = governor.explain({ action: ACTION.ALLOW_STOP, reason, detail: '' });
    assert.ok(text && text !== reason, `${reason} needs a human-readable explanation`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Manifest CRUD
// ─────────────────────────────────────────────────────────────────────────────

test('create writes a valid manifest and load reads it back', () => {
  withTmp((dir) => {
    const m = manifestLib.create({
      repoRoot: dir, tier: 'epic', target: 'autonomous-execution',
      unit: 'phase-32a-governor', nowIso: TS,
    });
    assert.match(m.run_id, /^run_[a-z0-9]{4,16}$/);
    assert.equal(m.status, 'running');

    const loaded = manifestLib.load(dir);
    assert.equal(loaded.run_id, m.run_id);
    assert.equal(loaded.cursor.unit, 'phase-32a-governor');
  });
});

test('load returns null when there is no run', () => {
  withTmp((dir) => assert.equal(manifestLib.load(dir), null));
});

test('an unknown schema_version is refused, never guessed', () => {
  withTmp((dir) => {
    manifestLib.create({ repoRoot: dir, tier: 'phase', target: 'p', nowIso: TS });
    const p = manifestLib.manifestPath(dir);
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    m.schema_version = 99;
    fs.writeFileSync(p, JSON.stringify(m), 'utf8');

    assert.throws(() => manifestLib.load(dir), /unsupported schema_version/);
    // ...but the hook path degrades to "no run" rather than trapping the session.
    assert.equal(manifestLib.loadSafe(dir), null);
  });
});

test('loadSafe swallows malformed JSON — the hook must never throw', () => {
  withTmp((dir) => {
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(manifestLib.manifestPath(dir), '{ not json', 'utf8');
    assert.throws(() => manifestLib.load(dir), /not valid JSON/);
    assert.equal(manifestLib.loadSafe(dir), null);
  });
});

test('advance is idempotent by cursor — a doubled event cannot skip a unit', () => {
  withTmp((dir) => {
    manifestLib.create({ repoRoot: dir, tier: 'phase', target: 'p', unit: 'G0', nowIso: TS });
    manifestLib.advance(dir, 'G1', TS);
    manifestLib.advance(dir, 'G1', TS);   // duplicate event
    const m = manifestLib.load(dir);
    assert.equal(m.cursor.unit, 'G1');
    assert.equal(m.audit.filter((a) => a.event === 'continue').length, 1);
  });
});

test('turn counting is separate from cursor advance, so a loop still hits its budget', () => {
  // If the counter lived inside the idempotent advance(), a run repeatedly
  // re-entering the same unit would never increment turns and never reach its
  // budget — the pre-mortem's runaway, with the guard silently disabled.
  withTmp((dir) => {
    manifestLib.create({ repoRoot: dir, tier: 'phase', target: 'p', unit: 'G0', nowIso: TS });
    manifestLib.recordTurn(dir, TS);
    manifestLib.recordTurn(dir, TS);
    manifestLib.recordTurn(dir, TS);
    assert.equal(manifestLib.load(dir).spent.turns, 3);
    assert.equal(manifestLib.load(dir).cursor.unit, 'G0', 'turns must not move the cursor');
  });
});

test('strikes accumulate and clear', () => {
  withTmp((dir) => {
    manifestLib.create({ repoRoot: dir, tier: 'phase', target: 'p', unit: 'G0', nowIso: TS });
    manifestLib.recordStrike(dir, 'G0', TS);
    manifestLib.recordStrike(dir, 'G0', TS);
    assert.equal(manifestLib.load(dir).strikes.G0, 2);
    manifestLib.clearStrikes(dir, 'G0');
    assert.equal(manifestLib.load(dir).strikes.G0, undefined);
  });
});

test('parks record and resolve through the manifest', () => {
  withTmp((dir) => {
    manifestLib.create({ repoRoot: dir, tier: 'phase', target: 'p', unit: 'G0', nowIso: TS });
    manifestLib.recordPark(dir, {
      id: '0001', question: 'S3 or GCS?', blocked_unit: 'G2', reason: 'operator-authority',
    }, TS);
    assert.equal(manifestLib.load(dir).parked[0].resolved, false);

    manifestLib.resolvePark(dir, '0001', 'S3', TS);
    const m = manifestLib.load(dir);
    assert.equal(m.parked[0].resolved, true);
    assert.equal(m.parked[0].answer, 'S3');
  });
});

test('the kill switch is a bare file any shell can touch', () => {
  withTmp((dir) => {
    manifestLib.create({ repoRoot: dir, tier: 'phase', target: 'p', nowIso: TS });
    assert.equal(manifestLib.killSwitchEngaged(dir), false);

    fs.writeFileSync(manifestLib.killSwitchPath(dir), '', 'utf8');
    assert.equal(manifestLib.killSwitchEngaged(dir), true);

    manifestLib.clearKillSwitch(dir);
    assert.equal(manifestLib.killSwitchEngaged(dir), false);
  });
});

test('a write leaves no temp file behind', () => {
  withTmp((dir) => {
    manifestLib.create({ repoRoot: dir, tier: 'phase', target: 'p', nowIso: TS });
    const files = fs.readdirSync(path.join(dir, '.momentum'));
    assert.ok(!files.some((f) => f.endsWith('.tmp')), 'write-then-rename must clean up');
    assert.ok(!files.some((f) => f.endsWith('.lock')), 'the lock must be released');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The interceptor backend
// ─────────────────────────────────────────────────────────────────────────────

test('the continuation message re-injects the pre-authorized action list', () => {
  const hook = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'hook'));
  const m = runningManifest();
  const msg = hook.continuationMessage(m, governor.decide({ manifest: m, killSwitch: false, now: TS }));

  // This IS the repair: the contract is re-established every turn rather than
  // remembered from the start of the phase.
  assert.match(msg, /continue without asking/);
  assert.match(msg, /Pre-authorized — proceed silently/);
  assert.match(msg, /the answer is always yes/);
  assert.match(msg, /Next:\s+G3/);
});

test('the continuation message names parked units as off-limits, not as a halt', () => {
  const hook = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'hook'));
  const m = runningManifest({
    parked: [{ id: 'p1', question: 'S3 or GCS?', blocked_unit: 'G9', resolved: false }],
  });
  const msg = hook.continuationMessage(m, governor.decide({ manifest: m, killSwitch: false, now: TS }));

  assert.match(msg, /do NOT work these units; everything else proceeds/);
  assert.match(msg, /G9: S3 or GCS\?/);
});

test('the continuation message tells the operator how to halt', () => {
  const hook = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'hook'));
  const m = runningManifest();
  const msg = hook.continuationMessage(m, governor.decide({ manifest: m, killSwitch: false, now: TS }));
  assert.match(msg, /Operator halt: touch .*run-stop/);
});

test('the hook script bails before node when there is no run', () => {
  // The invariance guarantee has to be cheap or it will be bypassed. Assert the
  // early exit exists in the script, ahead of any node invocation.
  const src = fs.readFileSync(path.join(REPO_ROOT, 'core', 'scripts', 'run-governor.sh'), 'utf8');
  const guardIdx = src.indexOf('[ -f "$root/.momentum/run.json" ] || exit 0');
  const nodeIdx = src.indexOf('node "$helper"');
  assert.ok(guardIdx > 0 && nodeIdx > guardIdx, 'the no-run guard must precede the node call');
});

// ── The production call path, exercised for real ─────────────────────────────
// BUG-031's whole lesson: `pollTurn` was green in tests for a year because the
// tests called it directly and production never did. These invoke the actual
// shell script as a subprocess — the same way the host fires it — and assert on
// its real exit codes.

test('PRODUCTION PATH — no run: the script exits 0 without touching node', () => {
  withTmp((dir) => {
    const r = spawnSync('bash', [path.join(REPO_ROOT, 'core', 'scripts', 'run-governor.sh')], {
      env: Object.assign({}, process.env, { MOMENTUM_PROJECT_DIR: dir }),
      input: '', encoding: 'utf8',
    });
    assert.equal(r.status, 0);
    assert.equal(r.stderr, '');
  });
});

test('PRODUCTION PATH — live run: the script exits 2 and delivers the continuation', () => {
  withTmp((dir) => {
    manifestLib.create({
      repoRoot: dir, tier: 'phase', target: 'phase-32a-governor',
      unit: 'G3', nowIso: TS, budget: { turns: 10 },
    });
    const r = spawnSync('bash', [path.join(REPO_ROOT, 'core', 'scripts', 'run-governor.sh')], {
      env: Object.assign({}, process.env, { MOMENTUM_PROJECT_DIR: dir }),
      input: '', encoding: 'utf8',
    });
    assert.equal(r.status, 2, 'exit 2 is what blocks the stop');
    assert.match(r.stderr, /continue without asking/);
    assert.match(r.stderr, /Next:\s+G3/);
    assert.equal(manifestLib.load(dir).spent.turns, 1, 'the turn must be counted');
  });
});

test('PRODUCTION PATH — kill switch: the script exits 0 and records the stop', () => {
  withTmp((dir) => {
    manifestLib.create({ repoRoot: dir, tier: 'phase', target: 'p', unit: 'G3', nowIso: TS });
    fs.writeFileSync(manifestLib.killSwitchPath(dir), '', 'utf8');

    const r = spawnSync('bash', [path.join(REPO_ROOT, 'core', 'scripts', 'run-governor.sh')], {
      env: Object.assign({}, process.env, { MOMENTUM_PROJECT_DIR: dir }),
      input: '', encoding: 'utf8',
    });
    assert.equal(r.status, 0, 'an engaged kill switch must always allow the stop');

    const m = manifestLib.load(dir);
    assert.equal(m.status, 'stopped');
    assert.match(m.audit[m.audit.length - 1].detail, /kill switch engaged/);
  });
});

test('PRODUCTION PATH — a corrupt manifest fails open rather than trapping the session', () => {
  withTmp((dir) => {
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(manifestLib.manifestPath(dir), '{ corrupt', 'utf8');

    const r = spawnSync('bash', [path.join(REPO_ROOT, 'core', 'scripts', 'run-governor.sh')], {
      env: Object.assign({}, process.env, { MOMENTUM_PROJECT_DIR: dir }),
      input: '', encoding: 'utf8',
    });
    assert.equal(r.status, 0, 'a broken governor must never block a stop');
  });
});

test('the hook script is one file shared by both interceptor adapters', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'core', 'scripts', 'run-governor.sh'), 'utf8');
  assert.match(src, /shared by Claude Code \+ Antigravity/);
  // Two copies would drift, and a governor behaving differently per platform is
  // the BUG-028/029/030 shape.
  assert.match(src, /ONE script for both adapters/);
});
