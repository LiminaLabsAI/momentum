'use strict';

/**
 * Phase 11 G1 — scout primitive unit tests.
 *
 * Exercises in-process scout against fixture repos, verifies run
 * artifact + session log writing, structured result shape, and the
 * record() API for agent-driven scouts.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf } = require('./_helpers');
const scoutLib = require('../core/orchestration/scout');

function mkFixtureRepo(tmp, name, specOverrides = {}) {
  const repo = path.join(tmp, name);
  fs.mkdirSync(path.join(repo, 'specs', 'architecture'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'specs', 'phases', 'phase-1-foo'), { recursive: true });

  fs.writeFileSync(
    path.join(repo, 'specs', 'status.md'),
    specOverrides['specs/status.md'] || `# ${name} status\n\nCurrent phase: 1\nAuth endpoint: POST /core/auth/v1/login\nFields: email, password, totp_code.\n`,
  );
  fs.writeFileSync(
    path.join(repo, 'specs', 'architecture', 'auth.md'),
    specOverrides['specs/architecture/auth.md'] || `# Auth\n\nPOST /core/auth/v1/login accepts { email, password, totp_code? } and returns 401 or 423.\n`,
  );
  fs.writeFileSync(
    path.join(repo, 'specs', 'phases', 'phase-1-foo', 'history.md'),
    specOverrides['specs/phases/phase-1-foo/history.md'] || `# History\n\n### [DECISION] 2026-01-01 — Locked auth shape\nDetail: Added totp_code field.\n`,
  );
  fs.writeFileSync(path.join(repo, 'README.md'), `# ${name}\n`);
  return repo;
}

test('scout() walks default scan files + dirs and returns a ScoutResult', async () => {
  const tmp = mktmp('scout-walk-');
  try {
    const repo = mkFixtureRepo(tmp, 'sapience');
    const result = await scoutLib.scout({
      repo,
      prompt: 'auth endpoint shape',
      originatingRepo: repo,
      silent: true,
    });

    assert.strictEqual(result.repo, repo);
    assert.strictEqual(result.prompt, 'auth endpoint shape');
    assert.ok(result.summary.length > 0);
    assert.ok(Array.isArray(result.findings));
    assert.ok(Array.isArray(result.filesRead));
    assert.ok(result.filesRead.includes('specs/status.md'));
    assert.ok(result.filesRead.some((f) => f.includes('auth.md')), 'should have read auth-related architecture file');
    assert.ok(typeof result.duration === 'number');
    assert.ok(fs.existsSync(result.runArtifactPath), 'artifact should be written');
    assert.match(result.runArtifactPath, /scout-\d{3}\.md$/);
  } finally {
    rmrf(tmp);
  }
});

test('scout() writes an artifact with summary + files-read + sections', async () => {
  const tmp = mktmp('scout-artifact-');
  try {
    const repo = mkFixtureRepo(tmp, 'sapience');
    const result = await scoutLib.scout({
      repo,
      prompt: 'auth login',
      originatingRepo: repo,
      silent: true,
    });
    const body = fs.readFileSync(result.runArtifactPath, 'utf8');
    assert.match(body, /^# scout-\d{3} — /);
    assert.match(body, /\*\*Prompt:\*\* auth login/);
    assert.match(body, /## Summary/);
    assert.match(body, /## Sections/);
  } finally {
    rmrf(tmp);
  }
});

test('scout() run-id is monotonic per primitive per repo', async () => {
  const tmp = mktmp('scout-monotonic-');
  try {
    const repo = mkFixtureRepo(tmp, 'sapience');
    const r1 = await scoutLib.scout({ repo, prompt: 'first', originatingRepo: repo, silent: true });
    const r2 = await scoutLib.scout({ repo, prompt: 'second', originatingRepo: repo, silent: true });
    const r3 = await scoutLib.scout({ repo, prompt: 'third', originatingRepo: repo, silent: true });
    assert.strictEqual(r1.runId, '001');
    assert.strictEqual(r2.runId, '002');
    assert.strictEqual(r3.runId, '003');
  } finally {
    rmrf(tmp);
  }
});

test('scout() appends to ecosystem session log when ecosystem is provided', async () => {
  const tmp = mktmp('scout-eco-log-');
  try {
    const ecoRoot = path.join(tmp, 'eco');
    fs.mkdirSync(ecoRoot, { recursive: true });
    fs.writeFileSync(path.join(ecoRoot, 'ecosystem.json'), JSON.stringify({
      name: 'eco', version: 1, members: [
        { id: 'm1', path: 'm1', role: 'other' },
        { id: 'm2', path: 'm2', role: 'other' },
      ],
    }, null, 2));
    const m1 = mkFixtureRepo(ecoRoot, 'm1');
    const m2 = mkFixtureRepo(ecoRoot, 'm2');

    await scoutLib.scout({
      repo: m2,
      prompt: 'auth shape',
      originatingRepo: m1,
      ecosystem: { rootPath: ecoRoot, memberId: 'm1' },
      silent: true,
    });

    const sessionsDir = path.join(ecoRoot, 'sessions');
    const files = fs.readdirSync(sessionsDir);
    assert.strictEqual(files.length, 1, 'one session file written');
    const text = fs.readFileSync(path.join(sessionsDir, files[0]), 'utf8');
    assert.match(text, /\[m1\] scout: scout/);
    assert.match(text, /run-001/);
  } finally {
    rmrf(tmp);
  }
});

test('scout() with no match returns "no content" summary', async () => {
  const tmp = mktmp('scout-no-match-');
  try {
    const repo = mkFixtureRepo(tmp, 'empty');
    const result = await scoutLib.scout({
      repo,
      prompt: 'kubernetes operator graphql federation',
      originatingRepo: repo,
      silent: true,
    });
    assert.match(result.summary, /No content matching/);
  } finally {
    rmrf(tmp);
  }
});

test('record() writes artifact + log line for an externally-performed scout', () => {
  const tmp = mktmp('scout-record-');
  try {
    const ecoRoot = path.join(tmp, 'eco');
    fs.mkdirSync(ecoRoot, { recursive: true });
    fs.writeFileSync(path.join(ecoRoot, 'ecosystem.json'), JSON.stringify({
      name: 'eco', version: 1, members: [{ id: 'm1', path: 'm1', role: 'other' }],
    }, null, 2));
    const m1 = mkFixtureRepo(ecoRoot, 'm1');

    const result = scoutLib.record({
      repo: '/somewhere/sapience',
      prompt: 'auth shape',
      summary: 'agent-summarized text here',
      filesRead: ['specs/status.md'],
      findings: [{ kind: 'discovery', title: 'minor doc gap', detail: 'noticed' }],
      originatingRepo: m1,
      ecosystem: { rootPath: ecoRoot, memberId: 'm1' },
      duration: 11,
    });

    assert.ok(fs.existsSync(result.runArtifactPath));
    const body = fs.readFileSync(result.runArtifactPath, 'utf8');
    assert.match(body, /agent-summarized text/);
    assert.match(body, /minor doc gap/);

    const files = fs.readdirSync(path.join(ecoRoot, 'sessions'));
    assert.strictEqual(files.length, 1);
    const log = fs.readFileSync(path.join(ecoRoot, 'sessions', files[0]), 'utf8');
    assert.match(log, /\[m1\] scout: \/somewhere\/sapience: auth shape/);
  } finally {
    rmrf(tmp);
  }
});

test('tokenize drops stopwords and short tokens', () => {
  const tokens = scoutLib.tokenize('What is the current state of the auth endpoint?');
  assert.ok(!tokens.includes('the'));
  assert.ok(!tokens.includes('is'));
  assert.ok(tokens.includes('auth'));
  assert.ok(tokens.includes('endpoint'));
});

test('extractRelevantSnippet returns hits around keyword lines', () => {
  const content = [
    'unrelated line 1',
    'unrelated line 2',
    'POST /core/auth/v1/login is the endpoint',
    'fields: email, password, totp_code',
    'errors: 401 / 423',
    'unrelated line later',
  ].join('\n');
  const snippet = scoutLib.extractRelevantSnippet(content, 'auth endpoint');
  assert.ok(snippet);
  assert.match(snippet, /POST \/core\/auth\/v1\/login/);
});
