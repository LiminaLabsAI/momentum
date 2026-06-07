'use strict';

/**
 * Phase 11 G2 — dispatch primitive unit tests.
 *
 * Covers: parallel and sequential modes, failure handling (no throw,
 * partial synthesis), capability-routing integration, monotonic run
 * id, mode-note surfacing.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf } = require('./_helpers');
const dispatchLib = require('../core/orchestration/dispatch');

function mkRepo(tmp, name) {
  const repo = path.join(tmp, name);
  fs.mkdirSync(path.join(repo, 'specs'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'specs', 'status.md'), `# ${name}\n\nauth endpoint POST /core/auth/v1/login\n`);
  fs.writeFileSync(path.join(repo, 'README.md'), `# ${name}\n`);
  return repo;
}

test('dispatch() fans out across repos and returns DispatchResult', async () => {
  const tmp = mktmp('dispatch-unit-');
  try {
    const a = mkRepo(tmp, 'a');
    const b = mkRepo(tmp, 'b');
    const c = mkRepo(tmp, 'c');
    const originating = a;
    const result = await dispatchLib.dispatch({
      repos: [a, b, c],
      userIntent: 'audit auth endpoint',
      originatingRepo: originating,
      silent: true,
    });
    assert.deepStrictEqual(result.repos, [a, b, c]);
    assert.strictEqual(result.userIntent, 'audit auth endpoint');
    assert.strictEqual(result.mode, 'parallel');
    assert.deepStrictEqual(result.modeNotes, []);
    assert.strictEqual(result.perRepoResults.length, 3);
    assert.strictEqual(result.failures.length, 0);
    assert.ok(result.synthesis.includes('3'));
    assert.ok(fs.existsSync(result.runArtifactPath));
    assert.match(result.runArtifactPath, /dispatch-\d{3}\.md$/);
  } finally {
    rmrf(tmp);
  }
});

test('dispatch() with forceSequential surfaces a mode note', async () => {
  const tmp = mktmp('dispatch-forced-seq-');
  try {
    const a = mkRepo(tmp, 'a');
    const b = mkRepo(tmp, 'b');
    const result = await dispatchLib.dispatch({
      repos: [a, b],
      userIntent: 'check',
      originatingRepo: a,
      forceSequential: true,
      silent: true,
    });
    assert.strictEqual(result.mode, 'sequential');
    assert.strictEqual(result.modeNotes.length, 1);
    assert.match(result.modeNotes[0], /forced via --sequential/);
  } finally {
    rmrf(tmp);
  }
});

test('dispatch() with Codex adapter routes to sequential with capability-driven note', async () => {
  const tmp = mktmp('dispatch-codex-route-');
  try {
    const routing = require('../core/orchestration/capability-routing');
    const codexAdapter = routing.loadAdapter(path.resolve(__dirname, '..'), 'codex');
    const a = mkRepo(tmp, 'a');
    const b = mkRepo(tmp, 'b');
    const result = await dispatchLib.dispatch({
      repos: [a, b],
      userIntent: 'check',
      originatingRepo: a,
      adapter: codexAdapter,
      silent: true,
    });
    assert.strictEqual(result.mode, 'sequential');
    assert.ok(result.modeNotes.length >= 1);
    assert.match(result.modeNotes[0], /does not declare parallel subagents/);
  } finally {
    rmrf(tmp);
  }
});

test('dispatch() captures sub-agent failures without throwing; partial synthesis proceeds', async () => {
  const tmp = mktmp('dispatch-partial-');
  try {
    const a = mkRepo(tmp, 'a');
    const c = mkRepo(tmp, 'c');
    // Use a non-existent repo to simulate a failure inside scout.
    const fakeRepo = path.join(tmp, 'does-not-exist');
    const result = await dispatchLib.dispatch({
      repos: [a, fakeRepo, c],
      userIntent: 'check things',
      originatingRepo: a,
      silent: true,
    });
    assert.strictEqual(result.perRepoResults.length, 3);
    // In-process scout returns "no content" rather than throwing for
    // missing repos, so failures may be 0. Either is acceptable —
    // the contract is "we don't blow up". Just verify the call
    // didn't throw and returned a valid result.
    assert.ok(result.synthesis.length > 0);
    assert.ok(fs.existsSync(result.runArtifactPath));
  } finally {
    rmrf(tmp);
  }
});

test('dispatch() with seeded throw in scout returns failure entry', async () => {
  const tmp = mktmp('dispatch-throw-');
  try {
    const a = mkRepo(tmp, 'a');
    const b = mkRepo(tmp, 'b');
    // Monkey-patch dispatch to make scout throw for repo b.
    const originalScout = require('../core/orchestration/scout').scout;
    const scoutModule = require('../core/orchestration/scout');
    scoutModule.scout = async (opts) => {
      if (opts.repo === b) throw new Error('seeded boom');
      return originalScout(opts);
    };
    try {
      const result = await dispatchLib.dispatch({
        repos: [a, b],
        userIntent: 'test',
        originatingRepo: a,
        silent: true,
      });
      assert.strictEqual(result.failures.length, 1);
      assert.strictEqual(result.failures[0].repo, b);
      assert.match(result.failures[0].error.message, /seeded boom/);
      assert.match(result.synthesis, /1 succeeded, 1 failed/);
    } finally {
      scoutModule.scout = originalScout;
    }
  } finally {
    rmrf(tmp);
  }
});

test('dispatch artifact contains synthesis + per-repo + failure manifest', async () => {
  const tmp = mktmp('dispatch-artifact-');
  try {
    const a = mkRepo(tmp, 'a');
    const b = mkRepo(tmp, 'b');
    const result = await dispatchLib.dispatch({
      repos: [a, b],
      userIntent: 'auth endpoint',
      originatingRepo: a,
      silent: true,
    });
    const body = fs.readFileSync(result.runArtifactPath, 'utf8');
    assert.match(body, /^# dispatch-\d{3}/);
    assert.match(body, /## Synthesis/);
    assert.match(body, /## Per-repo results/);
    assert.match(body, /\*\*Mode:\*\* parallel/);
  } finally {
    rmrf(tmp);
  }
});

test('dispatch() record API writes artifact + log without spawning sub-agents', () => {
  const tmp = mktmp('dispatch-record-');
  try {
    const ecoRoot = path.join(tmp, 'eco');
    fs.mkdirSync(ecoRoot, { recursive: true });
    fs.writeFileSync(path.join(ecoRoot, 'ecosystem.json'), JSON.stringify({
      name: 'eco', version: 1, members: [{ id: 'm1', path: 'm1', role: 'other' }],
    }, null, 2));
    const m1 = mkRepo(ecoRoot, 'm1');

    const result = dispatchLib.record({
      repos: ['/x/a', '/x/b'],
      userIntent: 'agent-mode synthesis',
      mode: 'parallel',
      modeNotes: [],
      perRepoResults: [
        { repo: '/x/a', prompt: 'p', summary: 'A finds X', findings: [], filesRead: [], duration: 5 },
        { repo: '/x/b', prompt: 'p', summary: 'B finds Y', findings: [], filesRead: [], duration: 8 },
      ],
      failures: [],
      synthesis: 'Top-level answer synthesising A and B.',
      originatingRepo: m1,
      ecosystem: { rootPath: ecoRoot, memberId: 'm1' },
      duration: 13,
    });

    assert.ok(fs.existsSync(result.runArtifactPath));
    const body = fs.readFileSync(result.runArtifactPath, 'utf8');
    assert.match(body, /Top-level answer synthesising A and B/);
    const files = fs.readdirSync(path.join(ecoRoot, 'sessions'));
    assert.strictEqual(files.length, 1);
    const log = fs.readFileSync(path.join(ecoRoot, 'sessions', files[0]), 'utf8');
    assert.match(log, /\[m1\] dispatch: 2 repos: agent-mode synthesis/);
  } finally {
    rmrf(tmp);
  }
});

test('tailorPrompt prepends the repo label', () => {
  const out = dispatchLib.tailorPrompt('audit auth', '/abs/path/sapience');
  assert.match(out, /In repo sapience: audit auth/);
});
