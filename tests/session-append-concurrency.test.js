'use strict';

/**
 * BUG-004 — session-log concurrent-commit race.
 *
 * Two concurrent commits in different member repos must produce two
 * clean entries in today's session file: no interleaving, no lost
 * lines, no duplicated header.
 *
 * The fix is a `mkdir`-based lock in `session-append.sh`. This test
 * spawns N parallel invocations against the same session file and
 * asserts all N lines land intact.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, REPO_ROOT } = require('./_helpers');
const {
  mkMemberRepo,
  mkEcosystemRoot,
} = require('./helpers/ecosystem-fixtures');

const SCRIPT = path.join(REPO_ROOT, 'core', 'ecosystem', 'scripts', 'session-append.sh');

function spawnAppend(memberDir, kind, summary, ctx) {
  return new Promise((resolve) => {
    const p = spawn('bash', [SCRIPT, kind, summary, ctx || ''], {
      cwd: memberDir,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    p.on('exit', (code) => resolve(code));
    p.on('error', () => resolve(-1));
  });
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

test('session-append.sh — 10 concurrent invocations produce 10 clean entries', async () => {
  const tmp = mktmp();
  try {
    // Set up an ecosystem with one member.
    const memberDir = path.join(tmp, 'member-a');
    mkMemberRepo(memberDir, 'demo');
    mkEcosystemRoot(path.join(tmp, 'demo'), 'demo', [
      { id: 'member-a', path: '../member-a', role: 'platform' },
    ]);

    // Spawn 10 parallel invocations.
    const N = 10;
    const procs = [];
    for (let i = 0; i < N; i++) {
      procs.push(spawnAppend(memberDir, 'commit', `msg${i}`, `sha${i}`));
    }
    const exitCodes = await Promise.all(procs);
    assert.ok(
      exitCodes.every((c) => c === 0),
      `expected all ${N} invocations to exit 0, got ${JSON.stringify(exitCodes)}`,
    );

    // Read today's session file from the ecosystem root.
    const sessionFile = path.join(tmp, 'demo', 'sessions', `${todayUtc()}.md`);
    assert.ok(fs.existsSync(sessionFile), 'session file should exist after appends');
    const content = fs.readFileSync(sessionFile, 'utf8');

    // Header should appear exactly once.
    const headerMatches = content.match(/^# Session /gm) || [];
    assert.equal(headerMatches.length, 1, `header line must appear exactly once; got ${headerMatches.length}`);

    // Each of the 10 distinct messages must appear exactly once.
    for (let i = 0; i < N; i++) {
      const expected = `commit: msg${i} (sha${i})`;
      const occurrences = content.split(expected).length - 1;
      assert.equal(occurrences, 1, `"${expected}" must appear exactly once; got ${occurrences}`);
    }

    // No partial/truncated lines: every non-empty line that names a
    // commit must include the member-id wrapping pattern.
    const commitLines = content
      .split('\n')
      .filter((l) => l.includes('commit:'));
    assert.equal(commitLines.length, N);
    for (const line of commitLines) {
      assert.match(line, /^\d{2}:\d{2}Z \[member-a\] commit: msg\d+ \(sha\d+\)$/);
    }

    // File ends with newline (POSIX expectation).
    assert.ok(content.endsWith('\n'), 'session file must end with newline');

    // Lock directory cleaned up.
    assert.ok(
      !fs.existsSync(`${sessionFile}.lock`),
      'lock directory should be released after writes',
    );
  } finally {
    rmrf(tmp);
  }
});

test('session-append.sh — singleton invocation still works (no regression)', async () => {
  const tmp = mktmp();
  try {
    const memberDir = path.join(tmp, 'solo-member');
    mkMemberRepo(memberDir, 'demo');
    mkEcosystemRoot(path.join(tmp, 'demo'), 'demo', [
      { id: 'solo-member', path: '../solo-member', role: 'platform' },
    ]);
    const code = await spawnAppend(memberDir, 'commit', 'lone-message', 'abc1234');
    assert.equal(code, 0);
    const sessionFile = path.join(tmp, 'demo', 'sessions', `${todayUtc()}.md`);
    const content = fs.readFileSync(sessionFile, 'utf8');
    assert.match(content, /^# Session /m);
    assert.match(content, /\[solo-member\] commit: lone-message \(abc1234\)/);
  } finally {
    rmrf(tmp);
  }
});
