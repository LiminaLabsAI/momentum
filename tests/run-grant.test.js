'use strict';

/**
 * Phase 32b G2 — the scope grant (ADR-0020).
 *
 * ADVERSARIAL TESTS FIRST, per the plan. This is the one-way door on ADR-0009's
 * trust layer: a grant lets ONE human approval fund N protected-branch pushes.
 * The happy path is three lines and obviously works; what matters is every way
 * a grant must REFUSE, and that each refusal is distinguishable — an operator
 * debugging a blocked push needs to know whether it expired, was revoked, or was
 * never for this branch.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT, mktmp, rmrf } = require('./_helpers');

const grant = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'grant'));
const manifestLib = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'manifest'));

const T0 = '2026-07-27T10:00:00Z';
const T_LATER = '2026-07-27T18:00:00Z';
const EXPIRES = '2026-07-27T16:00:00Z';

/** A repo with a run and a gitignored .momentum/, as an installed project has. */
function withRepo(fn) {
  const dir = mktmp();
  spawnSync('git', ['init', '-q', dir]);
  fs.writeFileSync(path.join(dir, '.gitignore'), '.momentum/*\n!.momentum/installed.json\n', 'utf8');
  manifestLib.create({
    repoRoot: dir, tier: 'epic', target: 'autonomous-execution',
    unit: 'phase-32b-epic-tier', nowIso: T0,
  });
  try { return fn(dir); } finally { rmrf(dir); }
}

function mintDefault(dir, over = {}) {
  return grant.mint(Object.assign({
    repoRoot: dir,
    epic: 'autonomous-execution',
    branches: ['staging', 'main'],
    expiresIso: EXPIRES,
    landings: 2,
    actor: 'ada@example.com',
    nowIso: T0,
  }, over));
}

// ─────────────────────────────────────────────────────────────────────────────
// REFUSALS — the reason this file exists
// ─────────────────────────────────────────────────────────────────────────────

test('REFUSE: an expired grant, and expiry is absolute not sliding', () => {
  // "The window is time, not action" — ADR-0020's third named hazard. A run that
  // goes wrong at hour three must not still be holding hour zero's yes.
  withRepo((dir) => {
    mintDefault(dir);
    const r = grant.consume(dir, { branch: 'main', epic: 'autonomous-execution', nowIso: T_LATER });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'expired');

    // Using it before expiry must NOT have extended it.
    const before = grant.consume(dir, { branch: 'main', epic: 'autonomous-execution', nowIso: T0 });
    assert.equal(before.ok, true);
    const after = grant.consume(dir, { branch: 'main', epic: 'autonomous-execution', nowIso: T_LATER });
    assert.equal(after.reason, 'expired', 'consumption must not slide the expiry');
  });
});

test('REFUSE: a branch outside the allowlist', () => {
  // The scope bound. A grant must never authorize work outside the plan's own
  // branches, however valid it is otherwise.
  withRepo((dir) => {
    mintDefault(dir, { branches: ['staging'] });
    const r = grant.consume(dir, { branch: 'main', epic: 'autonomous-execution', nowIso: T0 });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'branch-out-of-scope');
  });
});

test('REFUSE: a grant minted for a different epic', () => {
  withRepo((dir) => {
    mintDefault(dir, { epic: 'attachments' });
    const r = grant.consume(dir, { branch: 'main', epic: 'autonomous-execution', nowIso: T0 });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'epic-mismatch');
  });
});

test('REFUSE: a revoked grant, with no cached decision', () => {
  withRepo((dir) => {
    mintDefault(dir);
    grant.revoke(dir, T0);
    const r = grant.consume(dir, { branch: 'main', epic: 'autonomous-execution', nowIso: T0 });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'revoked');
  });
});

test('REFUSE: an exhausted landing budget — zero means exhausted, not unlimited', () => {
  // The count bound. A grant must not fund landings the plan never described.
  withRepo((dir) => {
    mintDefault(dir, { landings: 2 });
    assert.equal(grant.consume(dir, { branch: 'staging', epic: 'autonomous-execution', nowIso: T0 }).ok, true);
    assert.equal(grant.consume(dir, { branch: 'main', epic: 'autonomous-execution', nowIso: T0 }).ok, true);

    const third = grant.consume(dir, { branch: 'main', epic: 'autonomous-execution', nowIso: T0 });
    assert.equal(third.ok, false);
    assert.equal(third.reason, 'exhausted');
  });
});

test('REFUSE: no grant at all is its own distinct reason', () => {
  withRepo((dir) => {
    const r = grant.consume(dir, { branch: 'main', epic: 'x', nowIso: T0 });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'no-grant');
  });
});

test('every refusal reason is distinct — an operator must know WHICH bound they hit', () => {
  const reasons = new Set();
  withRepo((dir) => {
    reasons.add(grant.consume(dir, { branch: 'main', epic: 'e', nowIso: T0 }).reason);       // no-grant
    mintDefault(dir, { branches: ['staging'], landings: 1 });
    reasons.add(grant.consume(dir, { branch: 'main', epic: 'autonomous-execution', nowIso: T0 }).reason);  // out-of-scope
    reasons.add(grant.consume(dir, { branch: 'staging', epic: 'other', nowIso: T0 }).reason);              // epic-mismatch
    reasons.add(grant.consume(dir, { branch: 'staging', epic: 'autonomous-execution', nowIso: T_LATER }).reason); // expired
    grant.consume(dir, { branch: 'staging', epic: 'autonomous-execution', nowIso: T0 });                   // spend it
    reasons.add(grant.consume(dir, { branch: 'staging', epic: 'autonomous-execution', nowIso: T0 }).reason); // exhausted
    grant.revoke(dir, T0);
    reasons.add(grant.consume(dir, { branch: 'staging', epic: 'autonomous-execution', nowIso: T0 }).reason); // revoked
  });
  assert.deepEqual([...reasons].sort(),
    ['branch-out-of-scope', 'epic-mismatch', 'exhausted', 'expired', 'no-grant', 'revoked'].sort(),
    'all six bounds must be independently distinguishable');
});

// ─────────────────────────────────────────────────────────────────────────────
// A grant is a credential (ADR-0020 consequences)
// ─────────────────────────────────────────────────────────────────────────────

test('mint REFUSES when the grant would be committable', () => {
  // ADR-0020: "Committing one would publish an authorization — a failure mode
  // the sentinel does not have, since it is consumed immediately." Downstream
  // repos carry stale .gitignores, so this is checked rather than documented.
  const dir = mktmp();
  try {
    spawnSync('git', ['init', '-q', dir]);
    fs.writeFileSync(path.join(dir, '.gitignore'), '# nothing ignored\n', 'utf8');
    manifestLib.create({ repoRoot: dir, tier: 'epic', target: 'e', nowIso: T0 });

    assert.throws(() => mintDefault(dir), /not ignored by git/i,
      'minting into a committable path must refuse, not warn');
  } finally { rmrf(dir); }
});

test('mint requires all three bounds — an unbounded axis is an unbounded grant', () => {
  withRepo((dir) => {
    assert.throws(() => mintDefault(dir, { branches: [] }), /at least one branch/i);
    assert.throws(() => mintDefault(dir, { expiresIso: null }), /expiry required/i);
    assert.throws(() => mintDefault(dir, { landings: 0 }), /at least one landing/i);
  });
});

test('a grant records every consumption BEFORE the push, attributed', () => {
  // The compensating control for the human no longer being present at each
  // protected write. Recorded after the fact it would miss exactly the pushes
  // that went wrong.
  withRepo((dir) => {
    mintDefault(dir);
    grant.consume(dir, { branch: 'staging', epic: 'autonomous-execution', actor: 'ada@example.com', nowIso: T0 });

    const g = grant.load(dir);
    assert.equal(g.consumptions.length, 1);
    assert.equal(g.consumptions[0].branch, 'staging');
    assert.equal(g.consumptions[0].actor, 'ada@example.com');
    assert.equal(g.consumptions[0].remaining, 1);
  });
});

test('a refused consumption does not decrement the budget', () => {
  withRepo((dir) => {
    mintDefault(dir, { landings: 2 });
    grant.consume(dir, { branch: 'nope', epic: 'autonomous-execution', nowIso: T0 });
    grant.consume(dir, { branch: 'main', epic: 'wrong-epic', nowIso: T0 });
    assert.equal(grant.load(dir).landings_remaining, 2, 'refusals must be free');
  });
});

test('revocation takes effect immediately, on the next verification', () => {
  withRepo((dir) => {
    mintDefault(dir);
    assert.equal(grant.verify(grant.load(dir), { branch: 'main', epic: 'autonomous-execution', nowIso: T0 }).ok, true);
    grant.revoke(dir, T0);
    assert.equal(grant.verify(grant.load(dir), { branch: 'main', epic: 'autonomous-execution', nowIso: T0 }).ok, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Happy path + additivity
// ─────────────────────────────────────────────────────────────────────────────

test('a valid in-scope grant funds a landing and decrements', () => {
  withRepo((dir) => {
    const g = mintDefault(dir);
    assert.match(g.grant_id, /^grant_[a-z0-9]{4,16}$/);
    assert.equal(g.landings_remaining, 2);

    const r = grant.consume(dir, { branch: 'staging', epic: 'autonomous-execution', nowIso: T0 });
    assert.equal(r.ok, true);
    assert.equal(r.remaining, 1);
  });
});

test('verify is pure — it never mutates the grant', () => {
  withRepo((dir) => {
    mintDefault(dir);
    const before = JSON.stringify(grant.load(dir));
    grant.verify(grant.load(dir), { branch: 'main', epic: 'autonomous-execution', nowIso: T0 });
    assert.equal(JSON.stringify(grant.load(dir)), before);
  });
});

test('a repo with no run has no grant — and asking is not an error', () => {
  // Additivity: a project that never mints a grant must behave exactly as it
  // did before ADR-0020 existed.
  const dir = mktmp();
  try {
    assert.equal(grant.load(dir), null);
    assert.equal(grant.consume(dir, { branch: 'main', epic: 'x', nowIso: T0 }).reason, 'no-grant');
  } finally { rmrf(dir); }
});
