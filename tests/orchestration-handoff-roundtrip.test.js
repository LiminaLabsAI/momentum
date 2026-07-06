'use strict';

/**
 * Phase 11 G3 — handoff + continue roundtrip.
 *
 * Verifies: handoff writes inbox file in receiving repo with sentinel-
 * fenced structured block; continue parses the file, marks it read,
 * appends [NOTE] in receiving repo's active phase history; originating
 * repo gets a [DECISION] in its active phase history; multiple pending
 * handoffs picked up in id order.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf } = require('./_helpers');
const handoffLib = require('../core/orchestration/handoff');
const continueLib = require('../core/orchestration/continue');

function mkRepoWithPhase(tmp, name, phaseName) {
  const repo = path.join(tmp, name);
  const phaseDir = path.join(repo, 'specs', 'phases', phaseName);
  fs.mkdirSync(phaseDir, { recursive: true });
  fs.writeFileSync(path.join(phaseDir, 'history.md'), `# ${phaseName} history\n\n## Entries\n`);
  fs.writeFileSync(path.join(repo, 'README.md'), `# ${name}\n`);
  return repo;
}

test('handoff() writes a sentinel-fenced inbox file in the receiving repo', async () => {
  const tmp = mktmp('handoff-write-');
  try {
    const a = mkRepoWithPhase(tmp, 'a', 'phase-1-a');
    const b = mkRepoWithPhase(tmp, 'b', 'phase-1-b');
    const block = await handoffLib.handoff({
      fromRepo: a,
      toRepo: b,
      summary: 'Wire totp_code through LoginForm',
      decisions: ['Added totp_code field'],
      filesTouched: ['core/auth/login.ts'],
      verificationCommands: ['npm test'],
      openQuestions: ['Backwards compat for old clients?'],
      silent: true,
    });
    assert.strictEqual(block.fromRepo, a);
    assert.strictEqual(block.toRepo, b);
    assert.match(block.inboxPath, /handoff-001\.md$/);
    assert.ok(fs.existsSync(block.inboxPath));
    const body = fs.readFileSync(block.inboxPath, 'utf8');
    assert.match(body, /MOMENTUM_HANDOFF_BEGIN/);
    assert.match(body, /MOMENTUM_HANDOFF_END/);
    assert.match(body, /Wire totp_code/);
    assert.match(body, /Added totp_code field/);
    assert.match(body, /core\/auth\/login\.ts/);
    assert.match(body, /`npm test`/);
    assert.match(body, /Backwards compat/);
  } finally {
    rmrf(tmp);
  }
});

test('handoff() emits [DECISION] in originating repo active phase history', async () => {
  const tmp = mktmp('handoff-decision-');
  try {
    const a = mkRepoWithPhase(tmp, 'a', 'phase-2-orchestrate');
    const b = mkRepoWithPhase(tmp, 'b', 'phase-1-b');
    await handoffLib.handoff({
      fromRepo: a, toRepo: b,
      summary: 'A summary',
      silent: true,
    });
    const history = fs.readFileSync(path.join(a, 'specs', 'phases', 'phase-2-orchestrate', 'history.md'), 'utf8');
    assert.match(history, /\[DECISION\] \d{4}-\d{2}-\d{2} — Handoff #001 → b/);
    assert.match(history, /Topics: orchestration, handoff, handoff-001/);
    assert.match(history, /Affects-specs: .*handoff-001\.md/);
  } finally {
    rmrf(tmp);
  }
});

test('continueHandoff() parses inbox, marks read, emits [NOTE] in receiving history', async () => {
  const tmp = mktmp('continue-roundtrip-');
  try {
    const a = mkRepoWithPhase(tmp, 'a', 'phase-1-a');
    const b = mkRepoWithPhase(tmp, 'b', 'phase-1-b');
    const block1 = await handoffLib.handoff({
      fromRepo: a, toRepo: b,
      summary: 'Pickup test',
      decisions: ['locked X'],
      filesTouched: ['src/x.ts'],
      verificationCommands: ['npm test'],
      silent: true,
    });
    assert.ok(fs.existsSync(block1.inboxPath));

    const picked = await continueLib.continueHandoff({
      repo: b,
      silent: true,
    });
    assert.ok(picked, 'pickup returns a block');
    assert.strictEqual(picked.handoffId, '001');
    assert.strictEqual(picked.summary, 'Pickup test');
    assert.deepStrictEqual(picked.decisions, ['locked X']);
    assert.deepStrictEqual(picked.filesTouched, ['src/x.ts']);
    assert.deepStrictEqual(picked.verificationCommands, ['npm test']);
    // Original inbox file moved to read/.
    assert.ok(!fs.existsSync(block1.inboxPath));
    const readDir = path.join(b, '.momentum', 'inbox', 'read');
    assert.ok(fs.existsSync(path.join(readDir, 'handoff-001.md')));
    // [NOTE] in receiving phase history.
    const history = fs.readFileSync(path.join(b, 'specs', 'phases', 'phase-1-b', 'history.md'), 'utf8');
    assert.match(history, /\[NOTE\] \d{4}-\d{2}-\d{2} — Picked up handoff-001 from a/);
  } finally {
    rmrf(tmp);
  }
});

test('continueHandoff() returns null when no pending handoffs', async () => {
  const tmp = mktmp('continue-none-');
  try {
    const repo = mkRepoWithPhase(tmp, 'x', 'phase-1-x');
    const result = await continueLib.continueHandoff({ repo, silent: true });
    assert.strictEqual(result, null);
  } finally {
    rmrf(tmp);
  }
});

test('multiple pending handoffs are listed; pickup picks oldest by id', async () => {
  const tmp = mktmp('continue-many-');
  try {
    const a = mkRepoWithPhase(tmp, 'a', 'phase-1-a');
    const b = mkRepoWithPhase(tmp, 'b', 'phase-1-b');
    await handoffLib.handoff({ fromRepo: a, toRepo: b, summary: 'first', silent: true });
    await handoffLib.handoff({ fromRepo: a, toRepo: b, summary: 'second', silent: true });
    await handoffLib.handoff({ fromRepo: a, toRepo: b, summary: 'third', silent: true });

    const pending = handoffLib.listPending(b);
    assert.strictEqual(pending.length, 3);
    assert.ok(pending[0].endsWith('handoff-001.md'));
    assert.ok(pending[2].endsWith('handoff-003.md'));

    const picked = await continueLib.continueHandoff({ repo: b, silent: true });
    assert.strictEqual(picked.handoffId, '001');
    assert.strictEqual(picked.summary, 'first');

    // Two remain pending.
    const stillPending = handoffLib.listPending(b);
    assert.strictEqual(stillPending.length, 2);
  } finally {
    rmrf(tmp);
  }
});

test('continueHandoff() with specific id picks that handoff', async () => {
  const tmp = mktmp('continue-specific-');
  try {
    const a = mkRepoWithPhase(tmp, 'a', 'phase-1-a');
    const b = mkRepoWithPhase(tmp, 'b', 'phase-1-b');
    await handoffLib.handoff({ fromRepo: a, toRepo: b, summary: 'first', silent: true });
    await handoffLib.handoff({ fromRepo: a, toRepo: b, summary: 'second', silent: true });
    await handoffLib.handoff({ fromRepo: a, toRepo: b, summary: 'third', silent: true });

    const picked = await continueLib.continueHandoff({ repo: b, handoffId: '002', silent: true });
    assert.strictEqual(picked.handoffId, '002');
    assert.strictEqual(picked.summary, 'second');
  } finally {
    rmrf(tmp);
  }
});

test('continueHandoff() throws on unknown id', async () => {
  const tmp = mktmp('continue-bad-id-');
  try {
    const a = mkRepoWithPhase(tmp, 'a', 'phase-1-a');
    const b = mkRepoWithPhase(tmp, 'b', 'phase-1-b');
    await handoffLib.handoff({ fromRepo: a, toRepo: b, summary: 'one', silent: true });
    await assert.rejects(
      () => continueLib.continueHandoff({ repo: b, handoffId: '999', silent: true }),
      /handoff-999\.md not found/,
    );
  } finally {
    rmrf(tmp);
  }
});

test('parseInbox roundtrips renderInbox', async () => {
  const tmp = mktmp('parse-roundtrip-');
  try {
    const a = mkRepoWithPhase(tmp, 'a', 'phase-1-a');
    const b = mkRepoWithPhase(tmp, 'b', 'phase-1-b');
    const written = await handoffLib.handoff({
      fromRepo: a, toRepo: b,
      summary: 'multi-section block',
      decisions: ['d1', 'd2'],
      filesTouched: ['f1', 'f2', 'f3'],
      verificationCommands: ['npm test', 'npm run lint'],
      openQuestions: ['q1?'],
      silent: true,
    });
    const parsed = handoffLib.parseInbox(written.inboxPath);
    assert.strictEqual(parsed.summary, 'multi-section block');
    assert.deepStrictEqual(parsed.decisions, ['d1', 'd2']);
    assert.deepStrictEqual(parsed.filesTouched, ['f1', 'f2', 'f3']);
    assert.deepStrictEqual(parsed.verificationCommands, ['npm test', 'npm run lint']);
    assert.deepStrictEqual(parsed.openQuestions, ['q1?']);
  } finally {
    rmrf(tmp);
  }
});
