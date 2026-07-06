'use strict';

/**
 * Phase 11 G3 — `momentum handoff` and `momentum continue` CLI.
 *
 * Verifies the CLI doors end-to-end against a fixture ecosystem with
 * two member repos.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');

function mkEco(tmp) {
  const eco = path.join(tmp, 'eco');
  fs.mkdirSync(eco, { recursive: true });
  fs.writeFileSync(path.join(eco, 'ecosystem.json'), JSON.stringify({
    name: 'eco', version: 1, members: [
      { id: 'a', path: 'a', role: 'other' },
      { id: 'b', path: 'b', role: 'other' },
    ],
  }, null, 2));
  for (const name of ['a', 'b']) {
    const repo = path.join(eco, name);
    const phaseDir = path.join(repo, 'specs', 'phases', `phase-1-${name}`);
    fs.mkdirSync(phaseDir, { recursive: true });
    fs.writeFileSync(path.join(phaseDir, 'history.md'), '# h\n');
    fs.writeFileSync(path.join(repo, 'README.md'), `# ${name}\n`);
  }
  return eco;
}

test('momentum handoff <repo> writes inbox file + emits [DECISION] + logs session', () => {
  const tmp = mktmp('cli-handoff-');
  try {
    const eco = mkEco(tmp);
    const a = path.join(eco, 'a');
    const b = path.join(eco, 'b');
    const result = runCli(['handoff', 'b', '--summary', 'continue auth wiring'], { cwd: a });
    assert.strictEqual(result.status, 0, `cli failed: ${result.stderr}`);
    assert.match(result.stdout, /handoff written: .*handoff-001\.md/);

    const inbox = path.join(b, '.momentum', 'inbox', 'handoff-001.md');
    assert.ok(fs.existsSync(inbox));

    const aHistory = fs.readFileSync(path.join(a, 'specs', 'phases', 'phase-1-a', 'history.md'), 'utf8');
    assert.match(aHistory, /\[DECISION\].*Handoff #001 → b/);

    const sessionsDir = path.join(eco, 'sessions');
    const sessionFiles = fs.readdirSync(sessionsDir);
    assert.strictEqual(sessionFiles.length, 1);
    const log = fs.readFileSync(path.join(sessionsDir, sessionFiles[0]), 'utf8');
    assert.match(log, /\[a\] handoff:/);
  } finally {
    rmrf(tmp);
  }
});

test('momentum continue picks up the oldest pending handoff', () => {
  const tmp = mktmp('cli-continue-');
  try {
    const eco = mkEco(tmp);
    const a = path.join(eco, 'a');
    const b = path.join(eco, 'b');
    runCli(['handoff', 'b', '--summary', 'first'], { cwd: a });
    runCli(['handoff', 'b', '--summary', 'second'], { cwd: a });

    const result = runCli(['continue'], { cwd: b });
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /picking up handoff-001 from a/);
    assert.match(result.stdout, /Summary: first/);

    const stillPending = fs.readdirSync(path.join(b, '.momentum', 'inbox'))
      .filter((f) => /^handoff-\d{3}\.md$/.test(f));
    assert.strictEqual(stillPending.length, 1);
    assert.strictEqual(stillPending[0], 'handoff-002.md');
  } finally {
    rmrf(tmp);
  }
});

test('momentum continue --handoff 002 picks specific id', () => {
  const tmp = mktmp('cli-continue-spec-');
  try {
    const eco = mkEco(tmp);
    const a = path.join(eco, 'a');
    const b = path.join(eco, 'b');
    runCli(['handoff', 'b', '--summary', 'first'], { cwd: a });
    runCli(['handoff', 'b', '--summary', 'second'], { cwd: a });

    const result = runCli(['continue', '--handoff', '002'], { cwd: b });
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /picking up handoff-002/);
    assert.match(result.stdout, /Summary: second/);
  } finally {
    rmrf(tmp);
  }
});

test('momentum continue with no pending prints "no pending handoffs"', () => {
  const tmp = mktmp('cli-continue-none-');
  try {
    const eco = mkEco(tmp);
    const result = runCli(['continue'], { cwd: path.join(eco, 'b') });
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /no pending handoffs/);
  } finally {
    rmrf(tmp);
  }
});

test('momentum handoff --help prints usage', () => {
  const result = runCli(['handoff', '--help']);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Usage: momentum handoff/);
});

test('momentum continue --help prints usage', () => {
  const result = runCli(['continue', '--help']);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Usage: momentum continue/);
});
