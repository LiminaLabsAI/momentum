'use strict';

/**
 * Phase 31a G5 — the ecosystem lifecycle spine, end-to-end (ADR-0016).
 *
 * One scenario walks the whole spine across TWO clones sharing one ecosystem
 * remote, and asserts every acceptance criterion from overview.md:
 *
 *   AC-1  a commit from a LANE WORKTREE, outside members[].path, is captured
 *   AC-2  create → start → complete runs end-to-end across ≥2 members
 *   AC-3  complete REFUSES when a member lacks evidence, then passes when fixed
 *   AC-4  contributions / linked decisions / chronology are machine-written
 *   AC-5  a dependency edge registered by start is present in ecosystem.json
 *   AC-6  concurrent actors on two clones merge with ZERO git conflict
 *
 * All local (bare remote on disk). No network, no server, no daemon.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, write } = require('./_helpers');
const initLib = require('../core/ecosystem/lib/initiative');
const events = require('../core/ecosystem/lib/events');
const HOOK = require('../core/git-hooks/eco-event.js');

const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@x',
  GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@x',
};

function git(cwd, ...a) {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8', env: ENV });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')} failed: ${r.stderr}`);
  return (r.stdout || '').trim();
}
function cfg(d) {
  git(d, 'config', 'user.email', 't@x');
  git(d, 'config', 'user.name', 'T');
  git(d, 'config', 'commit.gpgsign', 'false');
}

test('ecosystem lifecycle spine: two clones, worktree commits, refusal then close', () => {
  const tmp = mktmp('eco-spine-');
  try {
    // ── machine A: ecosystem + two members ────────────────────────────────
    const A = path.join(tmp, 'A');
    fs.mkdirSync(A, { recursive: true });
    assert.equal(runCli(['ecosystem', 'init', 'eco'], { cwd: A }).status, 0);
    const rootA = path.join(A, 'eco');

    for (const [id, role] of [['backend', 'platform'], ['frontend', 'client']]) {
      const dir = path.join(A, id);
      fs.mkdirSync(dir, { recursive: true });
      git(dir, 'init', '-q');
      cfg(dir);
      assert.equal(runCli(['init', '.', '--agent', 'claude-code'], { cwd: dir }).status, 0);
      assert.equal(
        runCli(['ecosystem', 'add', `../${id}`, '--role', role, '--id', id], { cwd: rootA }).status,
        0,
      );
    }

    // The ecosystem root is itself a git repo with a bare remote (ADR-0015).
    const bare = path.join(tmp, 'eco.git');
    git(tmp, 'init', '--bare', '-q', bare);
    git(rootA, 'init', '-q');
    cfg(rootA);
    git(rootA, 'remote', 'add', 'origin', bare);
    git(rootA, 'add', '-A');
    git(rootA, 'commit', '-qm', 'chore: ecosystem root');
    git(rootA, 'branch', '-M', 'main');
    git(rootA, 'push', '-q', '-u', 'origin', 'main');

    // ── AC-2 / AC-5: create → start ───────────────────────────────────────
    assert.equal(runCli(['ecosystem', 'initiative', 'create', 'attachments',
      '--why', 'Users need attachments', '--repos', 'backend,frontend',
      '--owner', 'ada'], { cwd: rootA }).status, 0);

    const started = runCli(['ecosystem', 'initiative', 'start', 'attachments',
      '--contribute', 'backend:phase:phase-12-attachments',
      '--contribute', 'frontend:adhoc:fix-BUG-031-upload',
      '--edge', 'frontend:backend:api-contract'], { cwd: rootA });
    assert.equal(started.status, 0, started.stderr || started.stdout);

    // AC-5 — the edge exists, tagged with the initiative that found it.
    const manifest = JSON.parse(fs.readFileSync(path.join(rootA, 'ecosystem.json'), 'utf8'));
    assert.deepEqual(manifest.dependencies, [
      { from: 'frontend', to: 'backend', kind: 'api-contract', initiative: 'attachments' },
    ]);

    // AC-4 (part 1) — contributions table written by machinery.
    assert.match(initLib.loadInitiative(rootA, 'attachments').content,
      /\| backend \| phase \| `phase-12-attachments` \|/);

    // ── AC-1: real work, committed from a LANE WORKTREE ───────────────────
    const backend = path.join(A, 'backend');
    const worktree = path.join(tmp, 'lanes', 'phase-12-attachments');
    git(backend, 'worktree', 'add', '-q', '-b', 'phase-12-attachments', worktree);
    assert.notEqual(fs.realpathSync(worktree), fs.realpathSync(backend));

    write(path.join(worktree, 'attachments.js'), 'module.exports = {};\n');
    git(worktree, 'add', 'attachments.js');
    git(worktree, 'commit', '-qm', 'feat(attachments): storage adapter');

    // The post-commit hook fires inside the worktree — this is the case the
    // pre-31a $PWD write path silently dropped.
    const rec = HOOK.postCommit(worktree);
    assert.equal(rec.recorded, true, rec.reason);
    assert.equal(rec.member, 'backend');
    assert.match(events.compileSessionLog(rootA),
      /\[backend\] commit: feat\(attachments\): storage adapter/);

    // ── AC-3: the gate REFUSES before evidence exists ─────────────────────
    const refused = runCli(['ecosystem', 'initiative', 'complete', 'attachments'],
      { cwd: rootA });
    assert.notEqual(refused.status, 0, 'a refusing gate must exit non-zero');
    assert.match(refused.stdout + refused.stderr, /REFUSED/);
    assert.match(refused.stdout + refused.stderr, /backend.*missing retrospective/s);
    assert.equal(initLib.loadInitiative(rootA, 'attachments').frontmatter.status, 'in-progress');

    // ── each member completes its OWN lifecycle, producing evidence ───────
    const retroDir = path.join(backend, 'specs', 'phases', 'phase-12-attachments');
    fs.mkdirSync(retroDir, { recursive: true });
    write(path.join(retroDir, 'retrospective.md'),
      '---\ntype: Retrospective\n---\n\n# Phase 12 — Retrospective\n\n'
      + '## Verification Evidence\n\n`npm test` 412/412 green; upload round-trip verified.\n');

    const adhocDir = path.join(A, 'frontend', 'specs', 'adhoc', 'fix-BUG-031-upload');
    fs.mkdirSync(adhocDir, { recursive: true });
    write(path.join(adhocDir, 'record.md'), '# fix-BUG-031\nVerified: suite green.\n');

    // A member ADR stamped for this initiative (AC-4 part 2).
    const decDir = path.join(backend, 'specs', 'decisions');
    fs.mkdirSync(decDir, { recursive: true });
    write(path.join(decDir, '0007-object-storage.md'),
      '---\ntype: ADR\ninitiative: attachments\n---\n\n# ADR-0007: Object storage\n');

    // A release, captured as a tag event (AC-4 part 3 — chronology).
    const fragments = require('../core/team/lib/fragments');
    fragments.writeFragment(rootA, events.EVENTS_VIEW, 'ada', 'tag',
      { member: 'backend', summary: 'release v2.1.0', context: 'v2.1.0' },
      { ts: '2026-07-27T14:30:00.000Z', seq: 99 });

    // Declare the integration check so the close is genuinely gated.
    const mp = path.join(rootA, 'ecosystem.json');
    const m2 = JSON.parse(fs.readFileSync(mp, 'utf8'));
    m2.config = { integration_verify_command: 'echo cross-repo contract ok' };
    fs.writeFileSync(mp, JSON.stringify(m2, null, 2) + '\n');

    // ── AC-2 / AC-4: the gate now passes and writes every record ──────────
    const closed = runCli(['ecosystem', 'initiative', 'complete', 'attachments'],
      { cwd: rootA });
    assert.equal(closed.status, 0, closed.stderr || closed.stdout);

    const done = initLib.loadInitiative(rootA, 'attachments');
    assert.equal(done.frontmatter.status, 'closed');
    assert.match(done.content, /ADR-0007: Object storage/);          // linked decisions
    assert.match(done.content, /2026-07-27 14:30Z.*backend.*v2\.1\.0/); // chronology
    assert.match(done.content, /Integration verification: passed/);   // close
    assert.match(done.content, /\*\*backend\*\* \(phase:`phase-12-attachments`\)/);

    // ── AC-6: a second clone, concurrent writes, zero-conflict merge ──────
    const B = path.join(tmp, 'B');
    fs.mkdirSync(B, { recursive: true });
    git(B, 'clone', '-q', bare, 'eco');
    const rootB = path.join(B, 'eco');
    cfg(rootB);

    // Both clones record activity at the same instant, as different actors.
    HOOK.record({
      cwd: backend, kind: 'commit', summary: 'from machine A', context: 'aaa1111',
      ts: '2026-07-27T16:00:00.000Z', seq: 500,
      env: { ...process.env, MOMENTUM_ACTOR: 'ada' },
    });
    fragments.writeFragment(rootB, events.EVENTS_VIEW, 'bob', 'commit',
      { member: 'frontend', summary: 'from machine B', context: 'bbb2222' },
      { ts: '2026-07-27T16:00:00.000Z', seq: 500 });

    git(rootA, 'add', '-A');
    git(rootA, 'commit', '-qm', 'chore: machine A activity');
    git(rootA, 'push', '-q', 'origin', 'main');

    git(rootB, 'add', '-A');
    git(rootB, 'commit', '-qm', 'chore: machine B activity');
    // The merge that would conflict under a shared append-to-one-file log.
    git(rootB, 'fetch', '-q', 'origin');
    const merge = spawnSync('git', ['merge', '--no-edit', 'origin/main'],
      { cwd: rootB, encoding: 'utf8', env: ENV });
    assert.equal(merge.status, 0,
      `concurrent ecosystem activity must merge without conflict:\n${merge.stdout}${merge.stderr}`);

    // Both actors' events survive, attributed.
    const merged = events.compileSessionLog(rootB, '2026-07-27');
    assert.match(merged, /from machine A/);
    assert.match(merged, /from machine B/);
    assert.match(merged, /— ada/);
    assert.match(merged, /— bob/);
  } finally {
    rmrf(tmp);
  }
});
