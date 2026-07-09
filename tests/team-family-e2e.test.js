'use strict';

/**
 * Phase 30 FAMILY end-to-end — Walk + Run + Fly in one realistic scenario.
 *
 * Two developers (alice, bob) on two clones sharing one bare remote build
 * features as a team. Exercises every layer: durable identity, collision-free
 * claims, conflict-free fragment merge, presence, the shared landing turn, the
 * reviewer≠author gate, cross-machine leases, and the optional relay. This is
 * the "complete Phase 30 end-to-end by testing end-to-end" proof.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const { mktmp, rmrf, REPO_ROOT } = require('./_helpers');
const identity = require(path.join(REPO_ROOT, 'core', 'identity'));
const claimLib = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'claim'));
const compile = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'compile'));
const presence = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'presence'));
const approvals = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'approvals'));
const queue = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'queue'));
const lease = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'lease'));
const { createRelay } = require(path.join(REPO_ROOT, 'core', 'team', 'relay', 'server'));
const relayClient = require(path.join(REPO_ROOT, 'core', 'team', 'relay', 'client'));

function git(cwd, ...a) { return spawnSync('git', a, { cwd, encoding: 'utf8' }); }

test('Phase 30 family e2e: two devs, two clones — the whole team plane', async () => {
  const tmp = mktmp('team-family-');
  const relay = createRelay({});
  const relayUrl = await new Promise((res) => relay.listen((p) => res(`http://127.0.0.1:${p}`)));
  try {
    const bare = path.join(tmp, 'remote.git'); git(tmp, 'init', '--bare', '-q', bare);
    const A = path.join(tmp, 'a'); git(tmp, 'clone', '-q', bare, A); git(A, 'config', 'user.email', 'alice@team.dev'); git(A, 'config', 'user.name', 'Alice');
    const B = path.join(tmp, 'b'); git(tmp, 'clone', '-q', bare, B); git(B, 'config', 'user.email', 'bob@team.dev'); git(B, 'config', 'user.name', 'Bob');

    // 1. WALK — durable identity
    assert.equal(identity.resolveActor(A).id, 'alice');
    assert.equal(identity.resolveActor(B).id, 'bob');

    // seed main
    fs.writeFileSync(path.join(A, 'README.md'), 'team\n');
    git(A, 'add', '-A'); git(A, 'commit', '-q', '-m', 'init'); git(A, 'branch', '-M', 'main');
    assert.equal(git(A, 'push', '-q', '-u', 'origin', 'main').status, 0);
    git(B, 'pull', '-q', 'origin', 'main');

    // 2. WALK — collision-free claims: both reach for the same phase, one wins
    assert.equal(claimLib.claimKey(A, 'phase', '30-feature-x', { actor: 'alice' }).won, true);
    assert.equal(claimLib.claimKey(B, 'phase', '30-feature-x', { actor: 'bob' }).won, false);
    assert.equal(claimLib.claimKey(B, 'phase', '30-feature-y', { actor: 'bob' }).won, true);

    // 3. WALK — conflict-free fragment merge → shared board
    compile.recordActivePhase(A, 'alice', { branch: 'phase-30-feature-x', phase: '30x', status: 'in-progress', progress: 'building' });
    git(A, 'add', '-A'); git(A, 'commit', '-q', '-m', 'a row'); assert.equal(git(A, 'push', '-q', 'origin', 'main').status, 0);
    compile.recordActivePhase(B, 'bob', { branch: 'phase-30-feature-y', phase: '30y', status: 'open', progress: 'planning' });
    git(B, 'add', '-A'); git(B, 'commit', '-q', '-m', 'b row');
    assert.equal(git(B, 'pull', '--no-rebase', '--no-edit', '-q', 'origin', 'main').status, 0, 'fragment merge conflict-free');
    assert.equal(compile.activePhaseRows(B).length, 2);

    // 4. RUN — presence
    const t0 = '2026-07-10T12:00:00.000Z';
    presence.heartbeat(B, 'bob', { branch: 'phase-30-feature-y', activity: 'planning' }, { ts: t0 });
    const now = new Date(t0).getTime() + 30 * 1000;
    assert.equal(presence.presence(B, now)[0].liveness, 'active');

    // 5. RUN — shared landing turn: Alice holds, Bob blocked
    assert.equal(queue.takeTurn(A, 'main', 'alice').held, true);
    assert.equal(queue.takeTurn(B, 'main', 'bob').held, false);

    // 6. RUN — reviewer≠author: Alice's own approval is not enough; Bob's is
    approvals.approve(A, 'alice', 'phase-30-feature-x', { ts: '2026-07-10T12:01:00Z' });
    assert.equal(approvals.satisfied(A, 'phase-30-feature-x', { author: 'alice', threshold: 1 }), false);
    approvals.approve(A, 'bob', 'phase-30-feature-x', { ts: '2026-07-10T12:02:00Z' });
    assert.equal(approvals.satisfied(A, 'phase-30-feature-x', { author: 'alice', threshold: 1 }), true);

    // Alice lands + releases; Bob takes the runway
    queue.releaseTurn(A, 'main');
    assert.equal(queue.takeTurn(B, 'main', 'bob').held, true);
    queue.releaseTurn(B, 'main');

    // 7. FLY — cross-machine lease: single owner
    assert.equal(lease.acquireLease(A, 'deploy:prod', 'alice').held, true);
    assert.equal(lease.acquireLease(B, 'deploy:prod', 'bob').held, false);
    lease.releaseLease(A, 'deploy:prod');

    // 8. FLY — optional relay: Alice publishes, Bob sees it near-real-time (pre-sync)
    const pub = await relayClient.publish(relayUrl, { kind: 'active-phase', actor: 'alice', branch: 'phase-30-feature-x' });
    assert.equal(pub.ok, true);
    const seen = await relayClient.poll(relayUrl, 0);
    assert.equal(seen.events.length, 1);
    assert.equal(seen.events[0].actor, 'alice');

    // 9. FLY — graceful absence: no relay ⇒ git-native fallback, never throws
    assert.equal((await relayClient.publish('', { kind: 'x' })).skipped, true);
  } finally {
    await new Promise((r) => relay.close(r));
    rmrf(tmp);
  }
});
