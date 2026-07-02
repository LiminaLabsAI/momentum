'use strict';

/**
 * Phase 21a G1 — branch→phase resolution in check-history-reminder.sh.
 *
 * Rule 15 (Concurrent Workstreams): a session's phase is the one bound to
 * its branch — branch `phase-N-shortname` ↔ `specs/phases/phase-N-shortname/`.
 * The hook's HISTORY REMINDER must point at the resolved lane's history file:
 *   - phase-* branch with matching dir  → that phase's history.md (binding)
 *   - phase-* branch, no matching dir   → status.md Active Phase fallback
 *   - detached HEAD                     → status.md Active Phase fallback
 *   - non-phase branch (fix/*, chore/*) → ad-hoc sink (ENH-044 preserved)
 *   - nothing resolvable                → original generic wording
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, read, REPO_ROOT } = require('./_helpers');

const SCRIPT = path.join(REPO_ROOT, 'core', 'scripts', 'check-history-reminder.sh');

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

/**
 * Build a throwaway git repo simulating a momentum project.
 * `statusBranches` renders one Active Phase row per branch name (multi-row
 * board per Rule 15); `phaseDirs` creates specs/phases/<name>/ directories.
 */
function makeRepo({ branch = 'main', phaseDirs = [], statusBranches = null, detached = false } = {}) {
  const dir = mktmp('momentum-phase-res-');
  git(dir, 'init', '-q', '-b', branch);
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'Momentum Test');
  git(dir, 'config', 'commit.gpgsign', 'false');
  for (const p of phaseDirs) {
    fs.mkdirSync(path.join(dir, 'specs', 'phases', p), { recursive: true });
  }
  if (statusBranches) {
    const rows = statusBranches
      .map((b) => `| Phase for ${b} | \`${b}\` | In Progress | G0 |`)
      .join('\n');
    write(
      path.join(dir, 'specs', 'status.md'),
      [
        '# Project Status',
        '',
        '## Active Phase',
        '',
        '> One row per active lane (Rule 15).',
        '',
        '| Phase | Branch | Status | Progress |',
        '|-------|--------|--------|----------|',
        rows,
        '',
        '## Blockers',
        '',
        '_(none)_',
        '',
      ].join('\n')
    );
  }
  write(path.join(dir, 'README.md'), 'fixture\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--no-verify', '-m', 'init fixture');
  if (detached) {
    git(dir, 'checkout', '-q', '--detach', 'HEAD');
  }
  return dir;
}

function runScript(cwd, filePath = 'specs/status.md') {
  const payload = JSON.stringify({
    tool_name: 'Write',
    tool_input: { file_path: filePath },
  });
  const res = spawnSync('bash', [SCRIPT], { cwd, encoding: 'utf8', input: payload });
  assert.equal(res.status, 0, `hook script exited ${res.status}: ${res.stderr}`);
  return res.stdout;
}

test('phase-* branch with matching directory binds to that phase (Rule 15)', () => {
  const dir = makeRepo({ branch: 'phase-x-test', phaseDirs: ['phase-x-test'] });
  try {
    const out = runScript(dir);
    assert.match(out, /specs\/phases\/phase-x-test\/history\.md/);
    assert.match(out, /bound to branch 'phase-x-test'/);
  } finally {
    rmrf(dir);
  }
});

test('phase-* branch with no matching directory falls back to status.md', () => {
  const dir = makeRepo({
    branch: 'phase-ghost',
    phaseDirs: ['phase-real'],
    statusBranches: ['phase-real'],
  });
  try {
    const out = runScript(dir);
    assert.match(out, /specs\/phases\/phase-real\/history\.md/);
    assert.match(out, /status\.md Active Phase table/);
  } finally {
    rmrf(dir);
  }
});

test('detached HEAD falls back to status.md Active Phase table', () => {
  const dir = makeRepo({
    detached: true,
    phaseDirs: ['phase-x-test'],
    statusBranches: ['phase-x-test'],
  });
  try {
    const out = runScript(dir);
    assert.match(out, /specs\/phases\/phase-x-test\/history\.md/);
    assert.match(out, /status\.md Active Phase table/);
  } finally {
    rmrf(dir);
  }
});

test('non-phase branch routes to the ad-hoc sink (ENH-044 preserved)', () => {
  const dir = makeRepo({
    branch: 'fix/BUG-123-thing',
    phaseDirs: ['phase-x-test'],
    statusBranches: ['phase-x-test'],
  });
  try {
    const out = runScript(dir, 'specs/backlog/backlog.md');
    assert.match(out, /non-phase branch 'fix\/BUG-123-thing'/);
    assert.match(out, /specs\/adhoc\//);
    // Must NOT be pointed at a phase history — this lane is ad-hoc.
    assert.doesNotMatch(out, /phase-x-test\/history\.md/);
  } finally {
    rmrf(dir);
  }
});

test('multi-row status.md fallback: first row with an existing phase dir wins', () => {
  // First row's directory is missing → resolution must skip it and use row 2.
  const dir = makeRepo({
    detached: true,
    phaseDirs: ['phase-b-second'],
    statusBranches: ['phase-a-missing', 'phase-b-second'],
  });
  try {
    const out = runScript(dir);
    assert.match(out, /specs\/phases\/phase-b-second\/history\.md/);
  } finally {
    rmrf(dir);
  }

  // Both rows' directories exist → first row wins (deterministic order).
  const dir2 = makeRepo({
    detached: true,
    phaseDirs: ['phase-a-first', 'phase-b-second'],
    statusBranches: ['phase-a-first', 'phase-b-second'],
  });
  try {
    const out2 = runScript(dir2);
    assert.match(out2, /specs\/phases\/phase-a-first\/history\.md/);
    assert.doesNotMatch(out2, /phase-b-second\/history\.md/);
  } finally {
    rmrf(dir2);
  }
});

test('nothing resolvable keeps the generic wording', () => {
  // Detached HEAD, no status.md, no phase dirs → original generic message.
  const dir = makeRepo({ detached: true });
  try {
    const out = runScript(dir);
    assert.match(out, /specs\/phases\/<active-phase>\/history\.md/);
    assert.match(out, /specs\/adhoc\//);
  } finally {
    rmrf(dir);
  }
});

test('self-repo scripts/check-history-reminder.sh mirrors the core copy byte-for-byte', () => {
  const core = read(SCRIPT);
  const mirrored = read(path.join(REPO_ROOT, 'scripts', 'check-history-reminder.sh'));
  assert.equal(mirrored, core, 'self-repo mirror drifted from core/scripts/check-history-reminder.sh');
});
