'use strict';

/**
 * Phase 32c G0 — the governor backend CONFORMANCE SUITE.
 *
 * This file is the definition of parity. The same assertions run against BOTH
 * backends, parameterized, with **no backend-specific carve-outs** — because a
 * suite that special-cases a backend is not a parity suite, it is two suites
 * wearing one filename.
 *
 * Written BEFORE either backend is finished, deliberately. A conformance suite
 * authored afterwards is shaped by the implementations, and "parity" quietly
 * becomes "whatever both happen to do".
 *
 * The contract under test is `core/run/CONTRACT.md`:
 *   1. supports()    — can this backend run here?
 *   2. onTurnEnd()   — honour `continue`; never obstruct `allow-stop`
 *   3. idempotence   — a doubled event starts the next unit ONCE
 *   4. fail-open     — any internal error degrades to allowing the stop
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT, mktmp, rmrf } = require('./_helpers');

const backendLib = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'backend'));
const governor = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'governor'));
const manifestLib = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'manifest'));

const TS = '2026-07-27T10:00:00Z';

/** The four supported agents. Named explicitly so adding a fifth fails here. */
const ADAPTERS = ['antigravity', 'claude-code', 'codex', 'opencode'];

/**
 * The two backends under test. Each exposes the same shape; the harness below
 * never branches on which one it is holding.
 */
const BACKENDS = [
  {
    name: 'interceptor',
    load: () => require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'hook')),
  },
  {
    name: 'reinvoker',
    load: () => require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'reinvoke')),
  },
];

function withRun(fn) {
  const dir = mktmp();
  manifestLib.create({
    repoRoot: dir, tier: 'phase', target: 'p', unit: 'G1', nowIso: TS, budget: { turns: 50 },
  });
  try { return fn(dir); } finally { rmrf(dir); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend selection
// ─────────────────────────────────────────────────────────────────────────────

test('every adapter declares a governor backend — none is left undeclared', () => {
  // An undeclared capability is how silent non-functionality ships (BUG-009,
  // BUG-030, BUG-031). Absence must be stated, not implied.
  for (const name of ADAPTERS) {
    const r = backendLib.resolve(name);
    assert.ok(r.reason && !/does not declare governorBackend/.test(r.reason),
      `${name} must declare governorBackend — even if the value is null`);
  }
});

test('ALL FOUR adapters resolve to a real backend — this is the parity bar', () => {
  // The operator's requirement: "I need all the supported agent should have
  // this behaviour and feature." Two of four is not parity.
  assert.equal(ADAPTERS.length, 4, 'expected exactly the four supported agents');

  const nonAutonomous = ADAPTERS.filter((a) => !backendLib.resolve(a).autonomous);
  assert.deepEqual(nonAutonomous, [],
    `these adapters cannot drive an autonomous run: ${nonAutonomous.join(', ')}`);
});

test('the two interceptor adapters are the two that can block a stop', () => {
  assert.equal(backendLib.resolve('claude-code').kind, backendLib.KIND.INTERCEPTOR);
  assert.equal(backendLib.resolve('antigravity').kind, backendLib.KIND.INTERCEPTOR);
});

test('the two re-invoker adapters are the two that can only observe', () => {
  // Codex `notify`/`agent-turn-complete` and opencode `session.idle` are both
  // fire-and-forget.
  assert.equal(backendLib.resolve('codex').kind, backendLib.KIND.REINVOKER);
  assert.equal(backendLib.resolve('opencode').kind, backendLib.KIND.REINVOKER);
});

test('an unknown backend name fails loud rather than passing as "some backend"', () => {
  const tmp = mktmp();
  try {
    fs.mkdirSync(path.join(tmp, 'weird'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'weird', 'adapter.js'),
      "module.exports = { capabilities: { governorBackend: 'telepathy' } };\n", 'utf8');

    const r = backendLib.resolve('weird', { adaptersDir: tmp });
    assert.equal(r.autonomous, false);
    assert.match(r.reason, /unknown governorBackend "telepathy"/);
  } finally { rmrf(tmp); }
});

test('a declared-null backend states the degradation in words', () => {
  const tmp = mktmp();
  try {
    fs.mkdirSync(path.join(tmp, 'plain'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'plain', 'adapter.js'),
      'module.exports = { capabilities: { governorBackend: null } };\n', 'utf8');

    const r = backendLib.resolve('plain', { adaptersDir: tmp });
    assert.equal(r.kind, null);
    assert.equal(r.autonomous, false);
    assert.match(r.reason, /autonomous runs are unavailable on this agent/);
  } finally { rmrf(tmp); }
});

test('only interceptor adapters receive the interceptor hook script', () => {
  // 32a shipped run-governor.sh to all four, so Codex and opencode carried a
  // script neither could invoke — an installed tree advertising a capability
  // the adapter does not have.
  assert.equal(backendLib.wantsInterceptorScript('claude-code'), true);
  assert.equal(backendLib.wantsInterceptorScript('antigravity'), true);
  assert.equal(backendLib.wantsInterceptorScript('codex'), false);
  assert.equal(backendLib.wantsInterceptorScript('opencode'), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE CONFORMANCE SUITE — identical assertions, both backends
// ─────────────────────────────────────────────────────────────────────────────

for (const spec of BACKENDS) {
  test(`[${spec.name}] exposes the contract surface`, () => {
    const b = spec.load();
    assert.equal(typeof b.supports, 'function', 'supports() is required by CONTRACT.md');
    assert.equal(typeof b.onTurnEnd, 'function', 'onTurnEnd() is required by CONTRACT.md');
  });

  test(`[${spec.name}] honours "continue" by starting the next unit`, () => {
    withRun((dir) => {
      const b = spec.load();
      const manifest = manifestLib.load(dir);
      const decision = governor.decide({ manifest, killSwitch: false, now: TS });
      assert.equal(decision.action, governor.ACTION.CONTINUE);

      const r = b.onTurnEnd(decision, { repoRoot: dir, dryRun: true });
      assert.equal(r.started, true, 'a continue decision must start the next unit');
      assert.equal(r.unit, 'G1');
    });
  });

  test(`[${spec.name}] never obstructs "allow-stop"`, () => {
    withRun((dir) => {
      const b = spec.load();
      const decision = { action: governor.ACTION.ALLOW_STOP, reason: 'kill-switch', detail: '', next: null };
      const r = b.onTurnEnd(decision, { repoRoot: dir, dryRun: true });
      assert.equal(r.started, false);
      assert.equal(r.obstructed, false, 'a backend may never block a stop the governor allowed');
    });
  });

  test(`[${spec.name}] is idempotent — a doubled event starts the unit ONCE`, () => {
    // Platforms differ and retries happen. The manifest cursor is the guard,
    // not the backend's memory (CONTRACT.md).
    withRun((dir) => {
      const b = spec.load();
      const decision = governor.decide({ manifest: manifestLib.load(dir), killSwitch: false, now: TS });

      b.onTurnEnd(decision, { repoRoot: dir, dryRun: true });
      b.onTurnEnd(decision, { repoRoot: dir, dryRun: true });

      const m = manifestLib.load(dir);
      const advances = (m.audit || []).filter((a) => a.event === 'continue' && a.detail === 'G1');
      assert.ok(advances.length <= 1, 'the same unit must not be started twice');
    });
  });

  test(`[${spec.name}] fails open — an internal error allows the stop`, () => {
    // A broken governor that traps a session is strictly worse than none.
    const b = spec.load();
    const r = b.onTurnEnd({ action: governor.ACTION.CONTINUE, next: { unit: 'G1' } },
      { repoRoot: '/nonexistent/path/that/cannot/exist', dryRun: true });
    assert.equal(r.started, false);
    assert.equal(r.obstructed, false, 'failure must degrade to allowing the stop');
  });

  test(`[${spec.name}] does not decide for itself — it only acts on the decision`, () => {
    // A backend that adds its own conditions creates a second, untested
    // decision path (CONTRACT.md §"What a backend must NOT do").
    const src = fs.readFileSync(
      path.join(REPO_ROOT, 'core', 'run', 'lib', spec.name === 'interceptor' ? 'hook.js' : 'reinvoke.js'),
      'utf8');
    assert.ok(!/manifest\.status\s*===\s*'running'/.test(src),
      'backends must not re-implement governor branches');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// The external driver loop — re-invoker only, because it is the re-invoker's
// answer to a problem the interceptor does not have.
// ─────────────────────────────────────────────────────────────────────────────

test('DRIVER: the loop runs units until the governor says stop', () => {
  const reinvoke = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'reinvoke'));
  withRun((dir) => {
    let spawned = 0;
    // Fake agent: advances the cursor twice, then completes the run.
    const fakeSpawn = () => {
      spawned += 1;
      if (spawned === 1) manifestLib.advance(dir, 'G2', new Date().toISOString());
      else if (spawned === 2) manifestLib.advance(dir, 'G3', new Date().toISOString());
      else manifestLib.setStatus(dir, 'complete', new Date().toISOString(), 'done');
      return { status: 0 };
    };

    const r = reinvoke.drive({ repoRoot: dir, adapter: 'codex', spawnSync: fakeSpawn });
    assert.equal(r.units, 3);
    // Was /run is not in a running state/ until BUG-036 — i.e. the driver's
    // SUCCESS path reported the same string as an abandoned run. The re-invoker
    // was blind here exactly as the interceptor was.
    assert.match(r.stoppedBecause, /run complete/,
      'a loop that ran the plan to its end must say so');
  });
});

test('DRIVER: an agent that does not move the cursor is struck, not looped forever', () => {
  // Without this the driver would re-run the same unit until its budget died,
  // burning the whole run to produce the same failure repeatedly.
  const reinvoke = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'reinvoke'));
  withRun((dir) => {
    const r = reinvoke.drive({ repoRoot: dir, adapter: 'codex', spawnSync: () => ({ status: 0 }) });
    assert.match(r.stoppedBecause, /strike limit reached/);
    assert.equal(manifestLib.load(dir).strikes.G1, 3);
  });
});

test('DRIVER: the kill switch ends the loop', () => {
  const reinvoke = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'reinvoke'));
  withRun((dir) => {
    const fakeSpawn = () => {
      fs.writeFileSync(manifestLib.killSwitchPath(dir), '', 'utf8');
      manifestLib.advance(dir, 'G2', new Date().toISOString());
      return { status: 0 };
    };
    const r = reinvoke.drive({ repoRoot: dir, adapter: 'codex', spawnSync: fakeSpawn });
    assert.equal(r.units, 1);
    assert.match(r.stoppedBecause, /kill switch engaged/);
  });
});

test('DRIVER: an adapter with no declared headless path degrades, it does not pretend', () => {
  const reinvoke = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'reinvoke'));
  withRun((dir) => {
    const r = reinvoke.drive({ repoRoot: dir, adapter: 'antigravity' });
    assert.equal(r.units, 0);
    assert.equal(r.stoppedBecause, 'no-headless-path');
    assert.match(r.degraded, /momentum run continue/);
  });
});
