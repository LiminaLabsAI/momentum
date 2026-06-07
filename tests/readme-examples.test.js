'use strict';

/**
 * Structural sanity-checks on README bash blocks.
 *
 * We do NOT execute every README example end-to-end (some require an
 * npm-published artifact, others require a real Claude Code session).
 * Instead, we check that:
 *   - every command referenced in the README is one our CLI actually
 *     dispatches today (catches typos, stale flag names);
 *   - the README's promise of single-project quickstart works
 *     end-to-end against the local source (this is the only block we
 *     can run hermetically);
 *   - the ecosystem quickstart sequence executes successfully against
 *     the local source.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, REPO_ROOT } = require('./_helpers');
const lib = require('../core/ecosystem/lib');

const README = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8');

test('README references only commands our CLI knows', () => {
  // Pull every `momentum ...` token that looks like a CLI invocation.
  const invocations = [];
  const fenceBlocks = README.match(/```[\s\S]+?```/g) || [];
  for (const block of fenceBlocks) {
    const lines = block.split('\n');
    for (const line of lines) {
      const m = line.match(/(?:npx @[\w-]+\/momentum|^momentum)\s+([\w-]+)/);
      if (m) invocations.push(m[1]);
    }
  }
  const known = new Set([
    'init',
    'upgrade',
    'join',
    'leave',
    'doctor',
    'ecosystem',
    // Phase 11 orchestration verbs
    'scout',
    'dispatch',
    'handoff',
    'continue',
  ]);
  const unknown = invocations.filter((c) => !known.has(c));
  assert.deepEqual(unknown, [], `README mentions unknown commands: ${JSON.stringify(unknown)}`);
});

test('README single-project quickstart actually works against local source', () => {
  const tmp = mktmp();
  try {
    const project = path.join(tmp, 'quickstart');
    fs.mkdirSync(project);
    lib._clearRootCache();
    const r = runCli(['init'], { cwd: project });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);

    // The README promises: specs/, primary instruction file, slash
    // commands directory, hook script.
    assert.ok(fs.existsSync(path.join(project, 'CLAUDE.md')));
    assert.ok(fs.existsSync(path.join(project, 'specs', 'status.md')));
    assert.ok(fs.existsSync(path.join(project, 'specs', 'backlog', 'backlog.md')));
    assert.ok(fs.existsSync(path.join(project, '.claude', 'commands')));
  } finally {
    rmrf(tmp);
  }
});

test('README ecosystem quickstart sequence is wired end-to-end', () => {
  const tmp = mktmp();
  try {
    // Step 1: init --ecosystem from project A
    const projA = path.join(tmp, 'proj-a');
    fs.mkdirSync(projA);
    lib._clearRootCache();
    let r = runCli(['init', '--ecosystem', 'my-eco'], { cwd: projA });
    assert.equal(r.status, 0, `init --ecosystem failed: ${r.stderr}`);

    const ecoDir = path.join(tmp, 'my-eco');
    assert.ok(fs.existsSync(path.join(ecoDir, 'ecosystem.json')));

    // Step 2: from project B, join
    const projB = path.join(tmp, 'proj-b');
    fs.mkdirSync(projB);
    r = runCli(['init'], { cwd: projB });
    assert.equal(r.status, 0, `init B failed: ${r.stderr}`);
    lib._clearRootCache();
    r = runCli(['join', ecoDir], { cwd: projB });
    assert.equal(r.status, 0, `join failed: ${r.stderr}`);

    // Two members registered.
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ecoDir, 'ecosystem.json'), 'utf8'),
    );
    assert.equal(manifest.members.length, 2);
  } finally {
    rmrf(tmp);
  }
});

test('README CLI reference flags are recognized by the CLI', () => {
  // Smoke: --version, --help, --no-ecosystem, --agent all parse without crash.
  const r1 = runCli(['--version']);
  assert.equal(r1.status, 0);
  const r2 = runCli(['--help']);
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, /--ecosystem/);
  assert.match(r2.stdout, /--no-ecosystem/);
  assert.match(r2.stdout, /--agent/);
});

test('MOMENTUM_MAX_PARENT_WALK env var is documented and honored', () => {
  // Documentation check — env var must be documented in the ecosystem
  // architecture layout doc (canonical home for ecosystem internals).
  // Was checked against README in Phase 13 and earlier; Phase 14
  // rewrote the README as a marketing intro and moved env-var
  // documentation to the canonical site + architecture docs.
  const layoutDoc = fs.readFileSync(
    path.join(REPO_ROOT, 'core/ecosystem/layout.md'),
    'utf8'
  );
  assert.ok(
    /MOMENTUM_MAX_PARENT_WALK/.test(layoutDoc),
    'env var must be documented in core/ecosystem/layout.md'
  );

  // Behavior check: the env var sets the JS-side walk limit.
  const state = require('../core/ecosystem/lib/state');
  const saved = process.env.MOMENTUM_MAX_PARENT_WALK;
  process.env.MOMENTUM_MAX_PARENT_WALK = '12';
  try {
    assert.equal(state.getMaxParentWalk(), 12);
  } finally {
    if (saved === undefined) delete process.env.MOMENTUM_MAX_PARENT_WALK;
    else process.env.MOMENTUM_MAX_PARENT_WALK = saved;
  }
});
