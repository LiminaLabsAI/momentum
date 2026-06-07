'use strict';

/**
 * Phase 11 G0 — orchestration event emitter unit tests.
 *
 * Covers: kind validation, emit + subscribe, default renderer output,
 * default persister persistence.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf } = require('./_helpers');
const events = require('../core/orchestration/events');

test('EVENT_KINDS includes the documented primitive lifecycle + sub-agent + result events', () => {
  for (const kind of [
    'started', 'finished', 'failed',
    'step', 'note',
    'subagent-started', 'subagent-finished', 'subagent-failed',
    'finding', 'synthesized',
  ]) {
    assert.ok(events.EVENT_KINDS.includes(kind), `${kind} missing from EVENT_KINDS`);
  }
});

test('isValidKind rejects unknown kinds', () => {
  assert.strictEqual(events.isValidKind('started'), true);
  assert.strictEqual(events.isValidKind('not-a-real-kind'), false);
});

test('emit/subscribe end-to-end — subscriber receives every emitted event', () => {
  const seen = [];
  const emitter = events.createEmitter({ primitive: 'scout', repo: '/tmp/some-repo' });
  emitter.on((evt) => seen.push(evt));
  emitter.emit('started', { message: 'kicking off' });
  emitter.emit('step', { message: 'reading file' });
  emitter.emit('finished', { duration: 42 });

  assert.strictEqual(seen.length, 3);
  assert.strictEqual(seen[0].kind, 'started');
  assert.strictEqual(seen[0].primitive, 'scout');
  assert.strictEqual(seen[0].repo, '/tmp/some-repo');
  assert.strictEqual(seen[0].message, 'kicking off');
  assert.ok(seen[0].timestamp, 'event must carry a timestamp');
  assert.strictEqual(seen[2].duration, 42);
});

test('emit throws on unknown kind (catches typos at the source)', () => {
  const emitter = events.createEmitter({ primitive: 'scout' });
  assert.throws(() => emitter.emit('totally-fake'), /unknown event kind/);
});

test('on() returns an unsubscribe function', () => {
  const seen = [];
  const emitter = events.createEmitter({ primitive: 'scout' });
  const off = emitter.on((evt) => seen.push(evt));
  emitter.emit('started');
  off();
  emitter.emit('finished');
  assert.strictEqual(seen.length, 1, 'second emit should not reach unsubscribed handler');
});

test('subscriber errors do not break the emitter', () => {
  const emitter = events.createEmitter({ primitive: 'scout' });
  emitter.on(() => { throw new Error('oops'); });
  let secondCalled = false;
  emitter.on(() => { secondCalled = true; });
  // Should not throw; second subscriber should still run.
  emitter.emit('started');
  assert.strictEqual(secondCalled, true);
});

test('createRenderer formats lifecycle events with ▸', () => {
  const out = [];
  const stream = { write: (s) => out.push(s) };
  const renderer = events.createRenderer({ stream });
  const emitter = events.createEmitter({ primitive: 'scout', repo: 'sapience' });
  emitter.on(renderer);
  emitter.emit('started', { message: 'auth shape' });
  emitter.emit('step', { message: 'reading specs/' });
  emitter.emit('finished', { duration: 12, runArtifactPath: '.momentum/runs/scout-001.md' });

  const lines = out.join('').trim().split('\n');
  assert.strictEqual(lines[0], '▸ scout sapience: auth shape');
  assert.match(lines[1], /  ▸ reading specs\//);
  assert.match(lines[2], /▸ scout done .* \.momentum\/runs\/scout-001\.md/);
});

test('createRenderer handles dispatch sub-agent lifecycle events', () => {
  const out = [];
  const stream = { write: (s) => out.push(s) };
  const renderer = events.createRenderer({ stream });
  const emitter = events.createEmitter({ primitive: 'dispatch' });
  emitter.on(renderer);

  emitter.emit('subagent-started', { repo: 'sapience' });
  emitter.emit('subagent-finished', { repo: 'sapience', duration: 8 });
  emitter.emit('subagent-failed', { repo: 'frontend', error: 'timeout' });

  const text = out.join('');
  assert.match(text, /sapience…/);
  assert.match(text, /sapience… done/);
  assert.match(text, /frontend… FAILED: timeout/);
});

test('renderer silent mode produces no output', () => {
  const out = [];
  const stream = { write: (s) => out.push(s) };
  const renderer = events.createRenderer({ stream, silent: true });
  const emitter = events.createEmitter({ primitive: 'scout' });
  emitter.on(renderer);
  emitter.emit('started');
  emitter.emit('finished');
  assert.strictEqual(out.length, 0);
});

test('createPersister appends lifecycle events to the ecosystem session log', () => {
  const tmp = mktmp('orchestration-persister-');
  try {
    // Set up a fake ecosystem root.
    fs.writeFileSync(path.join(tmp, 'ecosystem.json'), JSON.stringify({
      name: 'test-eco',
      members: [{ id: 'm1', path: 'm1' }],
    }, null, 2));

    const persister = events.createPersister({ ecosystemRoot: tmp, memberId: 'm1' });
    const emitter = events.createEmitter({ primitive: 'scout', runId: '042' });
    emitter.on(persister);
    emitter.emit('started', { repo: 'sapience', message: 'auth shape' });
    emitter.emit('step', { message: 'this should NOT land in session log' });
    emitter.emit('finished', { runArtifactPath: '.momentum/runs/scout-042.md' });

    const sessionsDir = path.join(tmp, 'sessions');
    const files = fs.readdirSync(sessionsDir);
    assert.strictEqual(files.length, 1, 'exactly one daily session file should exist');
    const text = fs.readFileSync(path.join(sessionsDir, files[0]), 'utf8');

    assert.match(text, /^# Session \d{4}-\d{2}-\d{2}$/m);
    assert.match(text, /\[m1\] scout: scout sapience: auth shape \(run-042\)/);
    assert.match(text, /\[m1\] scout: scout done .*run-042/);
    assert.doesNotMatch(text, /this should NOT land/);
  } finally {
    rmrf(tmp);
  }
});
