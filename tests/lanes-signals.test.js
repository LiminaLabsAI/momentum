'use strict';

/**
 * Phase 21b G4 — `momentum lanes signal` / `momentum lanes inbox`
 * (core/lanes/lib/signals.js).
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, runCli, REPO_ROOT } = require('./_helpers');

const state = require(path.join(REPO_ROOT, 'core', 'lanes', 'lib', 'state'));

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

/** Repo inside a container dir so default lane worktrees land in the container. */
function makeRepo() {
  const container = mktmp('momentum-lanes-signals-');
  const dir = path.join(container, 'proj');
  fs.mkdirSync(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 'T');
  git(dir, 'config', 'commit.gpgsign', 'false');
  write(path.join(dir, 'README.md'), 'fixture\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--no-verify', '-m', 'init');
  return { container, dir };
}

function lanes(cwd, ...args) {
  return runCli(['lanes', ...args], { cwd });
}

test('signal round-trip: all 5 types, monotonic 4-digit seqs, body shape', () => {
  const { container, dir } = makeRepo();
  try {
    assert.equal(lanes(dir, 'open', 'feat/sig', '--no-worktree').status, 0);

    const sends = [
      ['pause'],
      ['resume'],
      ['redirect', 'switch', 'to', 'the', 'hotfix'],
      ['kill'],
      ['message', 'hello lane'],
    ];
    for (const [i, [type, ...text]] of sends.entries()) {
      const res = lanes(dir, 'signal', 'feat-sig', type, ...text);
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, new RegExp(`✓ signal 000${i + 1}-${type} → lane 'feat-sig'`));
    }

    const anchor = state.resolveAnchor(dir);
    const inbox = state.inboxDir(anchor, 'feat-sig');
    const names = fs.readdirSync(inbox).filter((n) => n.endsWith('.json')).sort();
    assert.deepEqual(names, [
      '0001-pause.json', '0002-resume.json', '0003-redirect.json',
      '0004-kill.json', '0005-message.json',
    ]);

    const redirect = JSON.parse(fs.readFileSync(path.join(inbox, '0003-redirect.json'), 'utf8'));
    assert.equal(redirect.stateVersion, state.STATE_VERSION);
    assert.equal(redirect.seq, 3);
    assert.equal(redirect.type, 'redirect');
    assert.equal(redirect.text, 'switch to the hotfix');
    assert.equal(redirect.from, 'main', 'from = sender branch');
    assert.ok(!Number.isNaN(Date.parse(redirect.at)), 'at is ISO parseable');

    const pause = JSON.parse(fs.readFileSync(path.join(inbox, '0001-pause.json'), 'utf8'));
    assert.equal(pause.text, null, 'textless signal stores null');

    // redirect/message with no text: gentle warning, still written
    const bare = lanes(dir, 'signal', 'feat-sig', 'message');
    assert.equal(bare.status, 0, 'warned but not failed');
    assert.match(bare.stdout, /⚠ 'message' usually carries text/);
    assert.match(bare.stdout, /✓ signal 0006-message/);
    assert.equal(state.unreadCount(anchor, 'feat-sig'), 6);
  } finally {
    rmrf(container);
  }
});

test('inbox lists unread oldest-first with seq/type/from/at/text; empty inbox says so', () => {
  const { container, dir } = makeRepo();
  try {
    assert.equal(lanes(dir, 'open', 'feat/list', '--no-worktree').status, 0);

    const empty = lanes(dir, 'inbox', 'feat-list');
    assert.equal(empty.status, 0, empty.stderr);
    assert.match(empty.stdout, /inbox empty/);

    assert.equal(lanes(dir, 'signal', 'feat-list', 'pause').status, 0);
    assert.equal(lanes(dir, 'signal', 'feat-list', 'message', 'rebase onto main please').status, 0);
    assert.equal(lanes(dir, 'signal', 'feat-list', 'resume').status, 0);

    const res = lanes(dir, 'inbox', 'feat-list');
    assert.equal(res.status, 0, res.stderr);
    const lines = res.stdout.trim().split('\n');
    assert.equal(lines.length, 3);
    assert.match(lines[0], /^0001 pause main \d{4}-\d{2}-\d{2}T[\d:.]+Z — -$/);
    assert.match(lines[1], /^0002 message main \d{4}-\d{2}-\d{2}T[\d:.]+Z — rebase onto main please$/);
    assert.match(lines[2], /^0003 resume main /);
  } finally {
    rmrf(container);
  }
});

test('--ack <seq> moves exactly one signal to processed/ and unreadCount drops', () => {
  const { container, dir } = makeRepo();
  try {
    assert.equal(lanes(dir, 'open', 'feat/ack', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'signal', 'feat-ack', 'pause').status, 0);
    assert.equal(lanes(dir, 'signal', 'feat-ack', 'message', 'mid').status, 0);
    assert.equal(lanes(dir, 'signal', 'feat-ack', 'resume').status, 0);

    const anchor = state.resolveAnchor(dir);
    assert.equal(state.unreadCount(anchor, 'feat-ack'), 3);

    const res = lanes(dir, 'inbox', 'feat-ack', '--ack', '2');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /✓ acked 0002-message → processed\//);

    assert.equal(state.unreadCount(anchor, 'feat-ack'), 2, 'exactly one moved');
    assert.ok(
      fs.existsSync(path.join(state.processedDir(anchor, 'feat-ack'), '0002-message.json')),
      'acked file landed in processed/'
    );
    const left = state.unreadSignals(anchor, 'feat-ack').map((s) => s.seq);
    assert.deepEqual(left, [1, 3], 'the other two stay unread');

    // acking a seq that is not unread fails loudly
    const again = lanes(dir, 'inbox', 'feat-ack', '--ack', '2');
    assert.equal(again.status, 1);
    assert.match(again.stderr, /no unread signal with seq 0002/);
  } finally {
    rmrf(container);
  }
});

test('--ack-all empties the inbox; seqs continue from processed history, never reset', () => {
  const { container, dir } = makeRepo();
  try {
    assert.equal(lanes(dir, 'open', 'feat/all', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'signal', 'feat-all', 'pause').status, 0);
    assert.equal(lanes(dir, 'signal', 'feat-all', 'kill').status, 0);
    assert.equal(lanes(dir, 'signal', 'feat-all', 'message', 'bye').status, 0);

    const res = lanes(dir, 'inbox', 'feat-all', '--ack-all');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /✓ acked 0001-pause → processed\//);
    assert.match(res.stdout, /✓ acked 0002-kill → processed\//);
    assert.match(res.stdout, /✓ acked 0003-message → processed\//);

    const anchor = state.resolveAnchor(dir);
    assert.equal(state.unreadCount(anchor, 'feat-all'), 0);
    assert.match(lanes(dir, 'inbox', 'feat-all').stdout, /inbox empty/);

    // the cross-ack monotonic property: next send is 0004, not 0001
    const next = lanes(dir, 'signal', 'feat-all', 'resume');
    assert.equal(next.status, 0, next.stderr);
    assert.match(next.stdout, /✓ signal 0004-resume/);
    assert.deepEqual(state.unreadSignals(anchor, 'feat-all').map((s) => s.seq), [4]);
  } finally {
    rmrf(container);
  }
});

test('unknown lane, invalid type, and bad flags exit 1 with clear stderr', () => {
  const { container, dir } = makeRepo();
  try {
    const noLane = lanes(dir, 'signal', 'ghost', 'pause');
    assert.equal(noLane.status, 1);
    assert.match(noLane.stderr, /no such lane: 'ghost'/);

    const noLaneInbox = lanes(dir, 'inbox', 'ghost');
    assert.equal(noLaneInbox.status, 1);
    assert.match(noLaneInbox.stderr, /no such lane: 'ghost'/);

    assert.equal(lanes(dir, 'open', 'feat/bad', '--no-worktree').status, 0);
    const badType = lanes(dir, 'signal', 'feat-bad', 'explode');
    assert.equal(badType.status, 1);
    assert.match(badType.stderr, /invalid signal type 'explode' \(expected pause\|resume\|redirect\|kill\|message\)/);

    const noArgs = lanes(dir, 'signal');
    assert.equal(noArgs.status, 1);
    assert.match(noArgs.stderr, /usage: momentum lanes signal/);

    const badFlag = lanes(dir, 'inbox', 'feat-bad', '--frob');
    assert.equal(badFlag.status, 1);
    assert.match(badFlag.stderr, /unknown flag '--frob'/);

    const badAck = lanes(dir, 'inbox', 'feat-bad', '--ack', 'xyz');
    assert.equal(badAck.status, 1);
    assert.match(badAck.stderr, /--ack needs a numeric seq/);
  } finally {
    rmrf(container);
  }
});

test('cross-session: signal sent from the MAIN worktree is readable + ackable from the LANE worktree', () => {
  const { container, dir } = makeRepo();
  const wt = path.join(container, 'wt-lane');
  try {
    // a second worktree, exactly how a lane session would have one
    git(dir, 'worktree', 'add', wt, '-b', 'lane-wt', 'main');
    const open = lanes(dir, 'open', 'lane-wt');
    assert.equal(open.status, 0, open.stderr);
    assert.match(open.stdout, /reusing existing checkout/);

    // send from the MAIN repo worktree (branch: main)
    const sent = lanes(dir, 'signal', 'lane-wt', 'message', 'hello across sessions');
    assert.equal(sent.status, 0, sent.stderr);
    assert.match(sent.stdout, /✓ signal 0001-message → lane 'lane-wt'/);

    // read from INSIDE the lane worktree — same anchor, different session cwd
    const inbox = runCli(['lanes', 'inbox', 'lane-wt'], { cwd: wt });
    assert.equal(inbox.status, 0, inbox.stderr);
    assert.match(inbox.stdout, /^0001 message main .*— hello across sessions$/m);

    // ack from the lane worktree; visible back at the main worktree's anchor
    const ack = runCli(['lanes', 'inbox', 'lane-wt', '--ack-all'], { cwd: wt });
    assert.equal(ack.status, 0, ack.stderr);
    assert.match(ack.stdout, /✓ acked 0001-message → processed\//);
    assert.equal(state.unreadCount(state.resolveAnchor(dir), 'lane-wt'), 0);
  } finally {
    rmrf(container);
  }
});
