'use strict';

/**
 * Phase 32b G5 — the end-to-end test the whole epic exists to pass.
 *
 * Acceptance criterion #1 of Epic 0001:
 *
 *     a ≥2-phase epic runs to completion with EXACTLY ONE human approval.
 *
 * Everything else in 32a and 32b is machinery in service of that sentence, so
 * this file drives the real surfaces — the CLI and the actual `pre-push` hook
 * as a subprocess — rather than calling libraries directly. A library-level
 * "e2e" would prove the parts work while saying nothing about whether a human's
 * `git push` is honoured, which is BUG-030's shape and the exact failure this
 * epic keeps rediscovering.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT, mktmp, rmrf } = require('./_helpers');

const manifestLib = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'manifest'));
const grantLib = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'grant'));
const epicLib = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'epic'));

const CLI = path.join(REPO_ROOT, 'bin', 'momentum.js');
const CHECK = path.join(REPO_ROOT, 'core', 'git-hooks', 'run-check.js');
const SHA = 'a'.repeat(40);

function mo(cwd, ...args) {
  return spawnSync('node', [CLI, ...args], { cwd, encoding: 'utf8' });
}

/** Drive the REAL pre-push hook the way git does. */
function push(cwd, branch) {
  return spawnSync('node', [CHECK, 'pre-push'], {
    cwd,
    input: `refs/heads/${branch} ${SHA} refs/heads/${branch} ${'0'.repeat(40)}\n`,
    encoding: 'utf8',
  });
}

/** A repo shaped like a real momentum install. */
function scaffold() {
  const dir = mktmp();
  spawnSync('git', ['init', '-q', dir]);
  spawnSync('git', ['-C', dir, 'config', 'user.email', 'ada@example.com']);
  fs.writeFileSync(path.join(dir, '.gitignore'), '.momentum/*\n', 'utf8');
  fs.mkdirSync(path.join(dir, 'specs', 'phases'), { recursive: true });
  return dir;
}

function withRepo(fn) {
  const dir = scaffold();
  try { return fn(dir); } finally { rmrf(dir); }
}

// ─────────────────────────────────────────────────────────────────────────────
// The headline: one approval, two landings
// ─────────────────────────────────────────────────────────────────────────────

test('E2E: a two-phase epic lands both phases on ONE approval', () => {
  withRepo((dir) => {
    const specs = path.join(dir, 'specs');

    // 1. Brainstorm once — the epic records the decisions.
    epicLib.create({
      specsDir: specs, slug: 'attachments',
      objective: 'upload and retrieve files',
      phases: ['phase-1-api', 'phase-2-ui'],
      policy: { release: 'per-feature' },
      nowIso: '2026-07-27T10:00:00Z',
    });

    // 2. Derive both phases' specs — NO interview at either.
    assert.equal(mo(dir, 'run', 'derive', 'phase-1-api', '--epic', 'attachments',
      '--date', '2026-07-27', '--write').status, 0);
    assert.equal(mo(dir, 'run', 'derive', 'phase-2-ui', '--epic', 'attachments',
      '--deps', 'phase-1-api', '--date', '2026-07-27', '--write').status, 0);

    for (const p of ['phase-1-api', 'phase-2-ui']) {
      const ov = fs.readFileSync(path.join(specs, 'phases', p, 'overview.md'), 'utf8');
      assert.match(ov, /Derived, not brainstormed/, `${p} must be derived`);
    }

    // 3. Start the epic run — it picks the first READY phase from the graph.
    const start = mo(dir, 'run', 'start', 'epic', 'attachments', '--release', 'per-feature');
    assert.equal(start.status, 0, start.stderr);
    assert.equal(manifestLib.load(dir).cursor.unit, 'phase-1-api');

    // 4. THE ONE APPROVAL. A human mints a single scope grant covering both
    //    landings. Nothing else in this test asks a human anything.
    const grant = mo(dir, 'run', 'grant', '--branches', 'staging,main',
      '--epic', 'attachments', '--hours', '8', '--landings', '2');
    assert.equal(grant.status, 0, grant.stderr);

    // 5. Phase 1 lands.
    const land1 = push(dir, 'staging');
    assert.equal(land1.status, 0, `phase 1 landing refused: ${land1.stderr}`);
    assert.match(land1.stderr, /scope grant .* consumed/);

    mo(dir, 'run', 'advance', 'phase-2-ui');

    // 6. Phase 2 lands — on the SAME approval.
    const land2 = push(dir, 'main');
    assert.equal(land2.status, 0, `phase 2 landing refused: ${land2.stderr}`);

    // 7. The budget is now spent; a third landing is refused.
    assert.notEqual(push(dir, 'main').status, 0, 'the grant must not outlive its budget');

    const g = grantLib.load(dir);
    assert.equal(g.landings_remaining, 0);
    assert.equal(g.consumptions.length, 2);
    assert.deepEqual(g.consumptions.map((c) => c.branch), ['staging', 'main']);
    for (const c of g.consumptions) {
      assert.equal(c.actor, 'ada@example.com', 'every landing must be attributed');
    }
  });
});

test('E2E: without the grant, the same two landings would need two approvals', () => {
  // The control. This is what the epic replaces — and it demonstrates that the
  // grant is genuinely doing the work rather than the branches being ungated.
  withRepo((dir) => {
    assert.notEqual(push(dir, 'staging').status, 0);
    assert.notEqual(push(dir, 'main').status, 0);

    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.momentum', 'merge-approved'), '', 'utf8');
    assert.equal(push(dir, 'staging').status, 0);
    assert.notEqual(push(dir, 'main').status, 0, 'the sentinel is single-use — hence two approvals');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Amendments, end to end
// ─────────────────────────────────────────────────────────────────────────────

test('E2E: a forward-only amendment reaches a phase that does not exist yet', () => {
  // The operator's original scenario: observe something after phase 1, change a
  // decision, and have phase 2 pick it up — without stopping anything.
  withRepo((dir) => {
    const specs = path.join(dir, 'specs');
    epicLib.create({
      specsDir: specs, slug: 'attachments',
      phases: ['phase-1-api', 'phase-2-ui'], nowIso: '2026-07-27T10:00:00Z',
    });
    mo(dir, 'run', 'derive', 'phase-1-api', '--epic', 'attachments', '--date', '2026-07-27', '--write');
    mo(dir, 'run', 'start', 'epic', 'attachments', '--unit', 'phase-1-api');

    const amend = mo(dir, 'run', 'amend', 'use GCS, not S3', '--forward-only');
    assert.equal(amend.status, 0, amend.stderr);
    assert.equal(manifestLib.load(dir).status, 'running', 'the run must not stop');

    // phase-2-ui has no specs yet — it gets the amendment as an INPUT.
    const derived = mo(dir, 'run', 'derive', 'phase-2-ui', '--epic', 'attachments', '--date', '2026-07-28');
    assert.match(derived.stdout, /use GCS, not S3/);
    assert.match(derived.stdout, /Operator amendments since the epic was written/);
  });
});

test('E2E: a backward-invalidating amendment stops the run and names the work', () => {
  withRepo((dir) => {
    epicLib.create({
      specsDir: path.join(dir, 'specs'), slug: 'attachments',
      phases: ['phase-1-api'], nowIso: '2026-07-27T10:00:00Z',
    });
    mo(dir, 'run', 'start', 'epic', 'attachments', '--unit', 'phase-1-api');
    mo(dir, 'run', 'advance', 'phase-2-ui');

    const r = mo(dir, 'run', 'amend', 'actually use GCS', '--invalidates', 'phase-1-api');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Affected completed work:/);
    assert.match(r.stdout, /- phase-1-api/);
    assert.equal(manifestLib.load(dir).status, 'stopped');
  });
});

test('E2E: an unsignalled amendment stops rather than being absorbed', () => {
  withRepo((dir) => {
    epicLib.create({
      specsDir: path.join(dir, 'specs'), slug: 'a', phases: ['p1'], nowIso: '2026-07-27T10:00:00Z',
    });
    mo(dir, 'run', 'start', 'epic', 'a', '--unit', 'p1');
    mo(dir, 'run', 'advance', 'p2');

    mo(dir, 'run', 'amend', 'switch storage backends');
    assert.equal(manifestLib.load(dir).status, 'stopped',
      'silence must not default to the cheap branch');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Reproducibility + invariance
// ─────────────────────────────────────────────────────────────────────────────

test('E2E: derivation is byte-reproducible across separate processes', () => {
  // In-process purity is easy; this proves it across process boundaries, where
  // a stray clock read or map-ordering difference would show up.
  const args = ['run', 'derive', 'phase-32c-adapter-parity', '--epic', 'autonomous-execution',
    '--deps', 'phase-32a-governor', '--date', '2026-07-27'];
  const a = spawnSync('node', [CLI, ...args], { cwd: REPO_ROOT, encoding: 'utf8' }).stdout;
  const b = spawnSync('node', [CLI, ...args], { cwd: REPO_ROOT, encoding: 'utf8' }).stdout;
  assert.equal(a, b);
  assert.ok(a.length > 500, 'and it must actually have produced a spec');
});

test('E2E: a repo with no epic and no run behaves exactly as v0.42.0 did', () => {
  // The invariance guarantee, at the epic tier this time.
  withRepo((dir) => {
    assert.equal(mo(dir, 'run', 'status').stdout.trim(), 'No active run.');
    assert.equal(mo(dir, 'epic', 'list').stdout.trim(), 'No epics.');
    assert.equal(grantLib.load(dir), null);

    const before = fs.readdirSync(dir).sort();
    spawnSync('bash', [path.join(REPO_ROOT, 'core', 'scripts', 'run-governor.sh')], {
      env: Object.assign({}, process.env, { MOMENTUM_PROJECT_DIR: dir }),
      input: '', encoding: 'utf8',
    });
    assert.deepEqual(fs.readdirSync(dir).sort(), before, 'nothing may be created');

    // And the protected-branch gate is untouched.
    assert.notEqual(push(dir, 'main').status, 0);
  });
});

test('E2E: the epic record momentum writes is the epic record momentum reads', () => {
  // The round trip that failed on the hand-authored bootstrap record (nested
  // policy map, outside the OKF subset). Anything `create` emits must load.
  withRepo((dir) => {
    const specs = path.join(dir, 'specs');
    epicLib.create({
      specsDir: specs, slug: 'round-trip', objective: 'x',
      phases: ['p1', 'p2'], policy: { release: 'per-feature' },
      nowIso: '2026-07-27T10:00:00Z',
    });
    const loaded = epicLib.load(specs, 'round-trip');
    assert.ok(loaded);
    assert.deepEqual(epicLib.validate(loaded.data), []);
    assert.equal(loaded.data.policy_release, 'per-feature');
    assert.deepEqual(loaded.data.phases, ['p1', 'p2']);
  });
});
