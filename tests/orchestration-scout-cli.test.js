'use strict';

/**
 * Phase 11 G1 — `momentum scout` CLI end-to-end.
 *
 * Verifies the CLI door against a fixture ecosystem: resolves repo
 * specs (member-id + path), writes run artifact + session log, and
 * surfaces the summary on stdout.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');

function mkEcosystem(tmp) {
  const eco = path.join(tmp, 'eco');
  fs.mkdirSync(eco, { recursive: true });
  fs.writeFileSync(path.join(eco, 'ecosystem.json'), JSON.stringify({
    name: 'eco',
    version: 1,
    members: [
      { id: 'sapience', path: 'sapience', role: 'other' },
      { id: 'frontend', path: 'frontend', role: 'other' },
    ],
  }, null, 2));
  for (const name of ['sapience', 'frontend']) {
    const repo = path.join(eco, name);
    fs.mkdirSync(path.join(repo, 'specs', 'architecture'), { recursive: true });
    fs.writeFileSync(
      path.join(repo, 'specs', 'status.md'),
      `# ${name} status\n\nAuth endpoint: POST /core/auth/v1/login (${name})\n`,
    );
    fs.writeFileSync(
      path.join(repo, 'specs', 'architecture', 'auth.md'),
      `# ${name} auth\n\nFields: email, password, totp_code?\n`,
    );
    fs.writeFileSync(path.join(repo, 'README.md'), `# ${name}\n`);
  }
  return eco;
}

test('momentum scout <member-id> "<prompt>" runs end-to-end in a fixture ecosystem', () => {
  const tmp = mktmp('scout-cli-');
  try {
    const eco = mkEcosystem(tmp);
    const originating = path.join(eco, 'sapience');
    const result = runCli(['scout', 'frontend', 'auth login'], { cwd: originating });
    assert.strictEqual(result.status, 0, `cli failed: ${result.stderr}`);
    assert.match(result.stdout, /scout/);
    // Run artifact lives in the ORIGINATING repo's .momentum/runs.
    const runsDir = path.join(originating, '.momentum', 'runs');
    assert.ok(fs.existsSync(runsDir), 'runs dir created in originating repo');
    const files = fs.readdirSync(runsDir).filter((f) => f.startsWith('scout-'));
    assert.strictEqual(files.length, 1, 'one scout artifact written');
  } finally {
    rmrf(tmp);
  }
});

test('momentum scout writes a session log line in the ecosystem', () => {
  const tmp = mktmp('scout-cli-log-');
  try {
    const eco = mkEcosystem(tmp);
    const originating = path.join(eco, 'sapience');
    runCli(['scout', 'frontend', 'login form'], { cwd: originating });
    const sessionsDir = path.join(eco, 'sessions');
    assert.ok(fs.existsSync(sessionsDir), 'sessions dir created');
    const files = fs.readdirSync(sessionsDir);
    assert.strictEqual(files.length, 1);
    const log = fs.readFileSync(path.join(sessionsDir, files[0]), 'utf8');
    assert.match(log, /\[sapience\] scout: scout/);
  } finally {
    rmrf(tmp);
  }
});

test('momentum scout rejects unknown repo spec with a helpful error', () => {
  const tmp = mktmp('scout-cli-bad-');
  try {
    const eco = mkEcosystem(tmp);
    const result = runCli(['scout', 'totally-fake', 'whatever'], { cwd: path.join(eco, 'sapience') });
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /could not resolve/);
  } finally {
    rmrf(tmp);
  }
});

test('momentum scout --help prints usage', () => {
  const result = runCli(['scout', '--help']);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Usage: momentum scout/);
  assert.match(result.stdout, /Doors:/);
  assert.match(result.stdout, /momentum scout/);
});

test('momentum scout resolves a relative path when not a member id', () => {
  const tmp = mktmp('scout-cli-rel-');
  try {
    const eco = mkEcosystem(tmp);
    const originating = path.join(eco, 'sapience');
    // Use a relative path to frontend instead of member id.
    const result = runCli(['scout', '../frontend', 'auth'], { cwd: originating });
    assert.strictEqual(result.status, 0, `cli failed: ${result.stderr}`);
  } finally {
    rmrf(tmp);
  }
});
