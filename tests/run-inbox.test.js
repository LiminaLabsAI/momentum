'use strict';

/**
 * Phase 32a G2 — the park primitive (`core/run/lib/inbox.js`) and the shared
 * mkdir lock it was extracted alongside.
 *
 * Two things are under test: that parking works at ANY tier (the reason it was
 * lifted out of swarm), and that lifting it changed nothing swarm depends on.
 * The 236 swarm tests are the second half of that gate; these are the first.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT, mktmp, rmrf } = require('./_helpers');

const inbox = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'inbox'));
const { withLock } = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'lock'));

const TS = '2026-07-27T10:00:00Z';

function withTmp(fn) {
  const dir = mktmp();
  try { return fn(dir); } finally { rmrf(dir); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Parking at any tier
// ─────────────────────────────────────────────────────────────────────────────

test('a park writes a numbered item and indexes it', () => {
  withTmp((dir) => {
    const r = inbox.writeItem({
      baseDir: dir, scope: 'phase-32a-governor', slug: 'storage-backend',
      question: 'S3 or GCS for attachment blobs?', nowIso: TS,
    });

    assert.equal(r.id, '0001');
    assert.ok(fs.existsSync(r.filePath));

    const body = fs.readFileSync(r.filePath, 'utf8');
    assert.match(body, /^# 0001 — storage-backend$/m);
    assert.match(body, /^- Scope: `phase-32a-governor`$/m);
    assert.match(body, /^- Status: pending$/m);
    assert.match(body, /S3 or GCS/);

    const index = fs.readFileSync(inbox.indexPath(dir), 'utf8');
    assert.match(index, /\| 0001 \| phase-32a-governor \| storage-backend \|/);
  });
});

test('ids are monotonic across the inbox lifetime, resolved included', () => {
  withTmp((dir) => {
    const a = inbox.writeItem({ baseDir: dir, scope: 'u', slug: 'one', question: 'q', nowIso: TS });
    const b = inbox.writeItem({ baseDir: dir, scope: 'u', slug: 'two', question: 'q', nowIso: TS });
    assert.deepEqual([a.id, b.id], ['0001', '0002']);

    // Resolving must not free the number — audit trails would collide.
    inbox.resolveItem({ baseDir: dir, id: '0001', answer: 'S3', nowIso: TS });
    const c = inbox.writeItem({ baseDir: dir, scope: 'u', slug: 'three', question: 'q', nowIso: TS });
    assert.equal(c.id, '0003');
  });
});

test('parking is non-blocking: independent items coexist and list in order', () => {
  withTmp((dir) => {
    inbox.writeItem({ baseDir: dir, scope: 'unit-b', slug: 'b-question', question: 'q', nowIso: TS });
    inbox.writeItem({ baseDir: dir, scope: 'unit-a', slug: 'a-question', question: 'q', nowIso: TS });

    const pending = inbox.listPending(dir);
    assert.equal(pending.length, 2);
    assert.deepEqual(pending.map((i) => i.id), ['0001', '0002']);
    assert.deepEqual(pending.map((i) => i.scope), ['unit-b', 'unit-a']);
  });
});

test('resolving preserves the item for audit rather than deleting it', () => {
  withTmp((dir) => {
    const { id } = inbox.writeItem({ baseDir: dir, scope: 'u', slug: 'q1', question: 'Which?', nowIso: TS });
    const r = inbox.resolveItem({ baseDir: dir, id, answer: 'The second one', nowIso: '2026-07-27T11:00:00Z' });

    assert.equal(inbox.listPending(dir).length, 0);
    assert.ok(fs.existsSync(r.resolvedPath), 'resolved items are preserved');

    const body = fs.readFileSync(r.resolvedPath, 'utf8');
    assert.match(body, /^- Status: resolved$/m);
    assert.match(body, /## Answer \(resolved at 2026-07-27T11:00:00Z\)/);
    assert.match(body, /The second one/);

    assert.match(fs.readFileSync(inbox.indexPath(dir), 'utf8'), /_\(no pending items\)_/);
  });
});

test('a park records its ADR-0019 classification reason when given one', () => {
  withTmp((dir) => {
    const r = inbox.writeItem({
      baseDir: dir, scope: 'u', slug: 'ambiguous-one', question: 'q',
      nowIso: TS, reason: 'ambiguous',
    });
    assert.match(fs.readFileSync(r.filePath, 'utf8'), /^- Reason: ambiguous$/m);
    assert.equal(inbox.listPending(dir)[0].reason, 'ambiguous');
  });
});

test('no Reason line is written when none is given — swarm items stay byte-identical', () => {
  withTmp((dir) => {
    const r = inbox.writeItem({ baseDir: dir, scope: 'u', slug: 'plain', question: 'q', nowIso: TS });
    assert.ok(!/^- Reason:/m.test(fs.readFileSync(r.filePath, 'utf8')));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Back-compat: items written before the extraction
// ─────────────────────────────────────────────────────────────────────────────

test('the reader accepts legacy `Repo:` items as well as `Scope:`', () => {
  withTmp((dir) => {
    inbox.ensureLayout(dir);
    // Exactly what core/swarm/inbox.js wrote before Phase 32a.
    fs.writeFileSync(path.join(inbox.inboxDir(dir), '0001-legacy.md'), [
      '# 0001 — legacy', '',
      '- Repo: `backend`',
      '- Asked at: 2026-07-01T00:00:00Z',
      '- Status: pending', '',
      '## Question', '', 'Legacy question', '',
    ].join('\n'), 'utf8');

    const [item] = inbox.listPending(dir);
    assert.equal(item.scope, 'backend', 'a legacy Repo: line must still resolve');
    assert.equal(item.status, 'pending');
  });
});

test('the field label is parametrizable so swarm keeps writing `Repo:`', () => {
  withTmp((dir) => {
    const r = inbox.writeItem({
      baseDir: dir, scope: 'backend', slug: 'q', question: 'q',
      nowIso: TS, fieldLabel: 'Repo',
    });
    assert.match(fs.readFileSync(r.filePath, 'utf8'), /^- Repo: `backend`$/m);
    assert.match(fs.readFileSync(inbox.indexPath(dir), 'utf8'), /\| ID \| Repo \| Slug \| Asked at \|/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Validation — a park that silently no-ops is worse than one that throws
// ─────────────────────────────────────────────────────────────────────────────

test('malformed parks are rejected, not silently dropped', () => {
  withTmp((dir) => {
    const base = { baseDir: dir, scope: 'u', slug: 'ok', question: 'q', nowIso: TS };
    assert.throws(() => inbox.writeItem({ ...base, slug: 'Bad Slug' }), /invalid slug/);
    assert.throws(() => inbox.writeItem({ ...base, slug: '1leading' }), /invalid slug/);
    assert.throws(() => inbox.writeItem({ ...base, question: '' }), /question required/);
    assert.throws(() => inbox.writeItem({ ...base, scope: 'Bad Scope' }), /invalid scope/);
  });
});

test('resolving a nonexistent or malformed id throws', () => {
  withTmp((dir) => {
    assert.throws(() => inbox.resolveItem({ baseDir: dir, id: '9999', answer: 'a', nowIso: TS }),
      /no pending inbox item/);
    assert.throws(() => inbox.resolveItem({ baseDir: dir, id: 'abc', answer: 'a', nowIso: TS }),
      /invalid id/);
    inbox.writeItem({ baseDir: dir, scope: 'u', slug: 'q', question: 'q', nowIso: TS });
    assert.throws(() => inbox.resolveItem({ baseDir: dir, id: '0001', answer: '', nowIso: TS }),
      /answer required/);
  });
});

test('listing an inbox that does not exist yet returns empty, not a throw', () => {
  withTmp((dir) => {
    assert.deepEqual(inbox.listPending(path.join(dir, 'nope')), []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The shared lock
// ─────────────────────────────────────────────────────────────────────────────

test('withLock runs the critical section and passes its return value through', () => {
  withTmp((dir) => {
    const target = path.join(dir, 'guarded.txt');
    const out = withLock(target, () => 42);
    assert.equal(out, 42);
    assert.ok(!fs.existsSync(`${target}.lock`), 'the lock must be released');
  });
});

test('withLock releases the lock even when the critical section throws', () => {
  withTmp((dir) => {
    const target = path.join(dir, 'guarded.txt');
    assert.throws(() => withLock(target, () => { throw new Error('boom'); }), /boom/);
    assert.ok(!fs.existsSync(`${target}.lock`), 'a throwing section must not wedge the lock');
  });
});

test('withLock reports the caller\'s label on timeout — swarm\'s message is unchanged', () => {
  withTmp((dir) => {
    const target = path.join(dir, 'contended.txt');
    fs.mkdirSync(`${target}.lock`);           // simulate a held lock
    assert.throws(
      () => withLock(target, () => 1, { label: 'swarm/manifest', budgetMs: 60 }),
      /^Error: swarm\/manifest: could not acquire lock at .*contended\.txt\.lock within budget$/
    );
    fs.rmdirSync(`${target}.lock`);
  });
});

test('swarm and run share ONE lock implementation', () => {
  // ADR-0018's discipline: two copies of a concurrency primitive is a bad place
  // to discover drift. Asserted structurally so a future copy-paste fails here.
  const manifestSrc = fs.readFileSync(
    path.join(REPO_ROOT, 'core', 'swarm', 'lib', 'manifest.js'), 'utf8');
  assert.match(manifestSrc, /require\('\.\.\/\.\.\/run\/lib\/lock'\)/);
  assert.ok(!/fs\.mkdirSync\(lockDir\)/.test(manifestSrc),
    'swarm must not carry its own mkdir-lock loop any more');
});
