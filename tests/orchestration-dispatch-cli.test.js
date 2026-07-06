'use strict';

/**
 * Phase 11 G2 — `momentum dispatch` CLI end-to-end.
 *
 * Verifies CLI dispatch against fixture ecosystem: resolves multiple
 * repos, writes artifact + session log, surfaces synthesis on stdout.
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
      { id: 'sapience', path: 'sapience', role: 'other' },
      { id: 'frontend', path: 'frontend', role: 'other' },
      { id: 'py', path: 'py', role: 'other' },
    ],
  }, null, 2));
  for (const name of ['sapience', 'frontend', 'py']) {
    const repo = path.join(eco, name);
    fs.mkdirSync(path.join(repo, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'specs', 'status.md'), `# ${name}\nAuth: header X-Cerebrio-Auth\n`);
    fs.writeFileSync(path.join(repo, 'README.md'), `# ${name}\n`);
  }
  return eco;
}

test('momentum dispatch across 3 fixture members produces synthesis + artifact', () => {
  const tmp = mktmp('dispatch-cli-');
  try {
    const eco = mkEco(tmp);
    const originating = path.join(eco, 'sapience');
    const result = runCli(
      ['dispatch', 'sapience', 'frontend', 'py', '--prompt', 'audit X-Cerebrio-Auth header usage'],
      { cwd: originating },
    );
    assert.strictEqual(result.status, 0, `cli failed: ${result.stderr}`);
    assert.match(result.stdout, /Dispatch across 3 repo/);
    const runsDir = path.join(originating, '.momentum', 'runs');
    const files = fs.readdirSync(runsDir).filter((f) => f.startsWith('dispatch-'));
    assert.strictEqual(files.length, 1);
  } finally {
    rmrf(tmp);
  }
});

test('momentum dispatch appends a session log line', () => {
  const tmp = mktmp('dispatch-cli-log-');
  try {
    const eco = mkEco(tmp);
    runCli(
      ['dispatch', 'sapience', 'frontend', '--prompt', 'check'],
      { cwd: path.join(eco, 'sapience') },
    );
    const sessionsDir = path.join(eco, 'sessions');
    const files = fs.readdirSync(sessionsDir);
    assert.strictEqual(files.length, 1);
    const log = fs.readFileSync(path.join(sessionsDir, files[0]), 'utf8');
    assert.match(log, /\[sapience\] dispatch: dispatch/);
  } finally {
    rmrf(tmp);
  }
});

test('momentum dispatch --sequential surfaces the forced-sequential note', () => {
  const tmp = mktmp('dispatch-cli-seq-');
  try {
    const eco = mkEco(tmp);
    const result = runCli(
      ['dispatch', 'sapience', 'frontend', '--prompt', 'check', '--sequential'],
      { cwd: path.join(eco, 'sapience') },
    );
    assert.strictEqual(result.status, 0);
    // The note appears as a step event "▸ <note>" in stdout via renderer.
    assert.match(result.stdout, /sequential mode forced via --sequential/);
  } finally {
    rmrf(tmp);
  }
});

test('momentum dispatch requires --prompt and a repo list', () => {
  const result1 = runCli(['dispatch'], { cwd: process.cwd() });
  assert.notStrictEqual(result1.status, 0);

  const tmp = mktmp('dispatch-cli-noprompt-');
  try {
    const eco = mkEco(tmp);
    const result2 = runCli(['dispatch', 'sapience'], { cwd: path.join(eco, 'sapience') });
    assert.notStrictEqual(result2.status, 0);
    assert.match(result2.stdout, /Usage: momentum dispatch/);
  } finally {
    rmrf(tmp);
  }
});

test('momentum dispatch --help prints usage', () => {
  const result = runCli(['dispatch', '--help']);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Usage: momentum dispatch/);
  assert.match(result.stdout, /--prompt/);
});

test('momentum dispatch warns about unresolved repo but continues with the rest', () => {
  const tmp = mktmp('dispatch-cli-unresolved-');
  try {
    const eco = mkEco(tmp);
    const result = runCli(
      ['dispatch', 'sapience', 'totally-fake', 'frontend', '--prompt', 'check'],
      { cwd: path.join(eco, 'sapience') },
    );
    assert.strictEqual(result.status, 0);
    assert.match(result.stderr, /skipping unresolved repo "totally-fake"/);
    assert.match(result.stdout, /Dispatch across 2 repo/);
  } finally {
    rmrf(tmp);
  }
});
