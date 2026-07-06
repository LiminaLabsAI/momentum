'use strict';

/**
 * Phase 11 G3 — SessionStart hook script behavior.
 *
 * Runs the actual sessionstart-handoff.sh against fixture inboxes
 * (non-TTY so the read step is skipped silently).
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, REPO_ROOT } = require('./_helpers');
const handoffLib = require('../core/orchestration/handoff');

const HOOK_SCRIPT = path.join(REPO_ROOT, 'core', 'scripts', 'sessionstart-handoff.sh');

function runHook(cwd) {
  return spawnSync('bash', [HOOK_SCRIPT], {
    cwd,
    encoding: 'utf8',
    timeout: 10000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

test('SessionStart hook exits 0 silently when no inbox dir', () => {
  const tmp = mktmp('hook-no-inbox-');
  try {
    const repo = path.join(tmp, 'r');
    fs.mkdirSync(repo, { recursive: true });
    const result = runHook(repo);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout, '');
    assert.strictEqual(result.stderr, '');
  } finally {
    rmrf(tmp);
  }
});

test('SessionStart hook exits 0 silently when inbox dir is empty', () => {
  const tmp = mktmp('hook-empty-inbox-');
  try {
    const repo = path.join(tmp, 'r');
    fs.mkdirSync(path.join(repo, '.momentum', 'inbox'), { recursive: true });
    const result = runHook(repo);
    assert.strictEqual(result.status, 0);
  } finally {
    rmrf(tmp);
  }
});

test('SessionStart hook prints a banner when a handoff is pending (non-TTY exits 0)', async () => {
  const tmp = mktmp('hook-banner-');
  try {
    const a = path.join(tmp, 'a');
    const b = path.join(tmp, 'b');
    fs.mkdirSync(path.join(a, 'specs', 'phases', 'phase-1-a'), { recursive: true });
    fs.writeFileSync(path.join(a, 'specs', 'phases', 'phase-1-a', 'history.md'), '# h\n');
    fs.mkdirSync(b, { recursive: true });
    await handoffLib.handoff({
      fromRepo: a, toRepo: b,
      summary: 'pickup test from a to b',
      silent: true,
    });

    const result = runHook(b);
    // Non-TTY → exit 0 after printing banner.
    assert.strictEqual(result.status, 0);
    assert.match(result.stderr, /1 pending handoff/);
    assert.match(result.stderr, /handoff-001 from a/);
    assert.match(result.stderr, /pickup test from a to b/);
    assert.match(result.stderr, /Read now\? \[y\/skip\]/);
  } finally {
    rmrf(tmp);
  }
});

test('SessionStart hook lists multiple pending handoffs', async () => {
  const tmp = mktmp('hook-multi-');
  try {
    const a = path.join(tmp, 'a');
    const b = path.join(tmp, 'b');
    fs.mkdirSync(path.join(a, 'specs', 'phases', 'phase-1-a'), { recursive: true });
    fs.writeFileSync(path.join(a, 'specs', 'phases', 'phase-1-a', 'history.md'), '# h\n');
    fs.mkdirSync(b, { recursive: true });
    await handoffLib.handoff({ fromRepo: a, toRepo: b, summary: 'first', silent: true });
    await handoffLib.handoff({ fromRepo: a, toRepo: b, summary: 'second', silent: true });

    const result = runHook(b);
    assert.strictEqual(result.status, 0);
    assert.match(result.stderr, /2 pending handoffs/);
    assert.match(result.stderr, /handoff-001/);
    assert.match(result.stderr, /handoff-002/);
  } finally {
    rmrf(tmp);
  }
});
