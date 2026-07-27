'use strict';

/**
 * Phase 32a G4 — `momentum run` CLI + `momentum config validate`.
 *
 * The config model is the operator's own ask: combinations ARE configurable,
 * "except the ones that are bad practice or break things." So the interesting
 * tests are the refusals — and that each refusal names the rule it breaks
 * rather than just saying no.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT, mktmp, rmrf } = require('./_helpers');

const rules = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'config-rules'));
const manifestLib = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'manifest'));

const CLI = path.join(REPO_ROOT, 'bin', 'momentum.js');

function run(cwd, ...args) {
  return spawnSync('node', [CLI, ...args], { cwd, encoding: 'utf8' });
}

function withTmp(fn) {
  const dir = mktmp();
  try { return fn(dir); } finally { rmrf(dir); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Config model — FREE
// ─────────────────────────────────────────────────────────────────────────────

test('the operator\'s requested setup is legal', () => {
  // "commit and push every phase, merge and release once at the end"
  const r = rules.validate({ release: 'per-feature', merge: 'per-feature', push: 'per-phase', tdd: 'strict' });
  assert.equal(r.ok, true, rules.format(r));
});

test('per-phase release with per-phase merge is legal', () => {
  assert.equal(rules.validate({ release: 'per-phase', merge: 'per-phase', push: 'per-group', tdd: 'strict' }).ok, true);
});

test('manual release defers everything to the human — legal', () => {
  assert.equal(rules.validate({ release: 'manual', merge: 'manual', push: 'per-phase', tdd: 'opt-in' }).ok, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Config model — COUPLED
// ─────────────────────────────────────────────────────────────────────────────

test('release finer than merge is refused, and the rule is named', () => {
  // Epic completion criterion #4.
  const r = rules.validate({ release: 'per-phase', merge: 'per-feature', push: 'per-phase', tdd: 'strict' });
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].id, 'release-not-finer-than-merge');
  assert.match(rules.format(r), /release granularity may never be finer than merge granularity/);
  assert.match(rules.format(r), /got: release=per-phase, merge=per-feature/);
  assert.match(rules.format(r), /why: /, 'a refusal must explain itself, not just refuse');
});

test('a coarse gate without strict TDD is refused', () => {
  // One approval covering several phases of diff is not a review anybody does,
  // so gate frequency may only be traded away for verification rigor.
  const r = rules.validate({ release: 'per-feature', push: 'per-phase', tdd: 'opt-in' });
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].id, 'coarse-gate-buys-strict-verification');
});

test('per-phase release with opt-in TDD stays legal — the coupling is scoped', () => {
  assert.equal(rules.validate({ release: 'per-phase', push: 'per-phase', tdd: 'opt-in' }).ok, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Config model — FLOOR
// ─────────────────────────────────────────────────────────────────────────────

test('push: never is unrepresentable, not merely discouraged', () => {
  assert.ok(!rules.VALID.push.includes('never'));
  const r = rules.validate({ release: 'per-phase', push: 'never', tdd: 'strict' });
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].id, 'push-invalid');
});

test('evidence capture cannot be switched off', () => {
  const r = rules.validate({ release: 'per-phase', push: 'per-phase', tdd: 'strict', capture_evidence: false });
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].id, 'evidence-always');
  assert.match(r.violations[0].why, /control signal/);
});

test('the merge-approval trust boundary cannot be configured away', () => {
  // ADR-0009: a run may change WHEN and AT WHAT GRANULARITY a human authorizes,
  // never whether.
  const r = rules.validate({ release: 'per-phase', push: 'per-phase', tdd: 'strict', skip_merge_approval: true });
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].id, 'human-authorizes-protected-push');
});

test('shape errors are reported without a cascade of secondary noise', () => {
  const r = rules.validate({ release: 'weekly', push: 'per-phase', tdd: 'strict' });
  assert.equal(r.ok, false);
  assert.equal(r.violations.length, 1, 'one typo should not produce five errors');
  assert.match(r.violations[0].rule, /release must be one of/);
});

test('validate is pure', () => {
  const p = { release: 'per-feature', push: 'per-phase', tdd: 'strict' };
  assert.deepEqual(rules.validate(p), rules.validate(p));
});

// ─────────────────────────────────────────────────────────────────────────────
// CLI — production call path
// ─────────────────────────────────────────────────────────────────────────────

test('momentum run is dispatched and documented in --help', () => {
  const help = run(REPO_ROOT, '--help').stdout;
  assert.match(help, /momentum run start <tier> <target>/);
  assert.match(help, /momentum run status/);
  assert.match(help, /touch \.momentum\/run-stop/, 'the halt path must be discoverable');
  assert.match(help, /momentum config validate/);
});

test('momentum run status reports no run cleanly', () => {
  withTmp((dir) => {
    const r = run(dir, 'run', 'status');
    assert.equal(r.status, 0);
    assert.match(r.stdout, /No active run/);
  });
});

test('momentum run start creates a manifest the governor can read', () => {
  withTmp((dir) => {
    const r = run(dir, 'run', 'start', 'phase', 'phase-32a-governor', '--unit', 'G4', '--turns', '20');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Run started: run_/);

    const m = manifestLib.load(dir);
    assert.equal(m.tier, 'phase');
    assert.equal(m.cursor.unit, 'G4');
    assert.equal(m.budget.turns, 20);
  });
});

test('an invalid tier is refused', () => {
  withTmp((dir) => {
    const r = run(dir, 'run', 'start', 'sprint', 'x');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /invalid tier "sprint"/);
  });
});

test('a second run cannot start over a live one', () => {
  withTmp((dir) => {
    run(dir, 'run', 'start', 'phase', 'a');
    const r = run(dir, 'run', 'start', 'phase', 'b');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /already active/);
  });
});

test('start clears a stale kill switch from a previous run', () => {
  // Otherwise the new run halts on its first turn for a reason belonging to
  // the last one — a confusing failure with no visible cause.
  withTmp((dir) => {
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.momentum', 'run-stop'), '', 'utf8');
    run(dir, 'run', 'start', 'phase', 'a');
    assert.equal(manifestLib.killSwitchEngaged(dir), false);
  });
});

test('status surfaces autonomous decisions and parked questions without stopping the run', () => {
  // The pre-mortem's mitigation for the silent-wrong-turn failure: an operator
  // must be able to look, at 3am, without interrupting anything.
  withTmp((dir) => {
    run(dir, 'run', 'start', 'phase', 'p', '--unit', 'G1');
    manifestLib.recordDecision(dir, {
      unit: 'G1', summary: 'chunked uploads manually', rationale: 'library lacks streaming',
    }, '2026-07-27T10:00:00Z');
    manifestLib.recordPark(dir, {
      id: '0001', question: 'S3 or GCS?', blocked_unit: 'G2', reason: 'operator-authority',
    }, '2026-07-27T10:00:00Z');

    const r = run(dir, 'run', 'status');
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Decisions taken autonomously \(1\)/);
    assert.match(r.stdout, /chunked uploads manually/);
    assert.match(r.stdout, /library lacks streaming/);
    assert.match(r.stdout, /Parked questions \(1\)/);
    assert.match(r.stdout, /these units are frozen, others proceed/);

    assert.equal(manifestLib.load(dir).status, 'running', 'status must not disturb the run');
  });
});

test('stop then continue round-trips through the manifest', () => {
  withTmp((dir) => {
    run(dir, 'run', 'start', 'phase', 'p', '--unit', 'G1');

    assert.equal(run(dir, 'run', 'stop', '--reason', 'checkpoint').status, 0);
    assert.equal(manifestLib.load(dir).status, 'stopped');

    assert.equal(run(dir, 'run', 'continue').status, 0);
    const m = manifestLib.load(dir);
    assert.equal(m.status, 'running');
    assert.equal(m.cursor.unit, 'G1', 'resume must not lose the cursor');
  });
});

test('continue clears an engaged kill switch', () => {
  withTmp((dir) => {
    run(dir, 'run', 'start', 'phase', 'p');
    fs.writeFileSync(manifestLib.killSwitchPath(dir), '', 'utf8');
    run(dir, 'run', 'continue');
    assert.equal(manifestLib.killSwitchEngaged(dir), false);
  });
});

test('status --json emits the manifest for tooling', () => {
  withTmp((dir) => {
    run(dir, 'run', 'start', 'epic', 'autonomous-execution');
    const r = run(dir, 'run', 'status', '--json');
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.tier, 'epic');
    assert.equal(parsed.schema_version, 1);
  });
});

test('momentum config validate passes on this repo and rejects a bad combination', () => {
  const ok = run(REPO_ROOT, 'config', 'validate');
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /run policy is valid/);
});
