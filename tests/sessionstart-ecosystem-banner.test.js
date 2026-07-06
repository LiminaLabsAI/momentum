'use strict';

/**
 * ENH-033 — SessionStart hook surfaces ecosystem context.
 *
 * Before: `core/scripts/sessionstart-handoff.sh` only banner-ed pending
 * handoffs. An agent opening a session inside a member repo got no
 * in-context signal of the ecosystem it was working in.
 *
 * After: the same hook now also prints (to stderr, before the handoff
 * banner) one or two lines naming the reachable ecosystem and the
 * active initiative when set. Detection mirrors the parent-walk +
 * sibling-scan algorithm from `core/ecosystem/scripts/session-append.sh`
 * so what the session log considers reachable is what the banner names.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, REPO_ROOT } = require('./_helpers');

const HOOK = path.join(REPO_ROOT, 'core', 'scripts', 'sessionstart-handoff.sh');

function runHook(cwd) {
  return spawnSync('bash', [HOOK], {
    cwd,
    encoding: 'utf8',
    timeout: 10000,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function writeEcosystem(dir, name, members = [], activeInitiative = null) {
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, '.state'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'ecosystem.json'),
    JSON.stringify(
      { name, version: 1, members, dependencies: [] },
      null,
      2,
    ) + '\n',
    'utf8',
  );
  if (activeInitiative) {
    fs.writeFileSync(
      path.join(dir, '.state', 'active-initiative'),
      activeInitiative,
      'utf8',
    );
  }
}

test('SessionStart: silent when no ecosystem reachable + no inbox', () => {
  const tmp = mktmp();
  try {
    const r = runHook(tmp);
    assert.equal(r.status, 0);
    assert.equal(r.stderr.trim(), '', 'stderr should be empty');
    assert.equal(r.stdout.trim(), '', 'stdout should be empty');
  } finally {
    rmrf(tmp);
  }
});

test('SessionStart: from ecosystem root, prints name + member count', () => {
  const tmp = mktmp();
  try {
    const root = path.join(tmp, 'myeco');
    writeEcosystem(root, 'myeco', [
      { id: 'a', path: '../a', role: 'other' },
      { id: 'b', path: '../b', role: 'other' },
    ]);
    const r = runHook(root);
    assert.equal(r.status, 0);
    assert.match(r.stderr, /▸ Ecosystem: myeco \(2 members\)/);
  } finally {
    rmrf(tmp);
  }
});

test('SessionStart: from a member repo with sibling ecosystem, prints context', () => {
  const tmp = mktmp();
  try {
    const eco = path.join(tmp, 'demo');
    writeEcosystem(eco, 'demo', [{ id: 'a', path: '../a', role: 'other' }]);
    const member = path.join(tmp, 'a');
    fs.mkdirSync(member);
    const r = runHook(member);
    assert.equal(r.status, 0);
    assert.match(r.stderr, /▸ Ecosystem: demo \(1 member\)/);
  } finally {
    rmrf(tmp);
  }
});

test('SessionStart: prints active initiative when .state/active-initiative is set', () => {
  const tmp = mktmp();
  try {
    const eco = path.join(tmp, 'demo');
    writeEcosystem(eco, 'demo', [], 'memory-module-v1');
    const r = runHook(eco);
    assert.equal(r.status, 0);
    assert.match(r.stderr, /▸ Ecosystem: demo \(0 members\)/);
    assert.match(r.stderr, /▸ Active initiative: memory-module-v1/);
  } finally {
    rmrf(tmp);
  }
});

test('SessionStart: silent on active-initiative file present but empty', () => {
  const tmp = mktmp();
  try {
    const eco = path.join(tmp, 'demo');
    writeEcosystem(eco, 'demo');
    // explicitly empty file
    fs.writeFileSync(path.join(eco, '.state', 'active-initiative'), '', 'utf8');
    const r = runHook(eco);
    assert.equal(r.status, 0);
    assert.match(r.stderr, /Ecosystem: demo/);
    assert.doesNotMatch(r.stderr, /Active initiative/);
  } finally {
    rmrf(tmp);
  }
});

test('SessionStart: pluralisation is correct (1 member vs N members)', () => {
  const tmp = mktmp();
  try {
    const eco1 = path.join(tmp, 'eco1');
    writeEcosystem(eco1, 'eco1', [{ id: 'x', path: '../x', role: 'other' }]);
    const r1 = runHook(eco1);
    assert.match(r1.stderr, /\(1 member\)/);

    const eco2 = path.join(tmp, 'eco2');
    writeEcosystem(eco2, 'eco2', [
      { id: 'x', path: '../x', role: 'other' },
      { id: 'y', path: '../y', role: 'other' },
    ]);
    const r2 = runHook(eco2);
    assert.match(r2.stderr, /\(2 members\)/);

    const eco0 = path.join(tmp, 'eco0');
    writeEcosystem(eco0, 'eco0');
    const r0 = runHook(eco0);
    assert.match(r0.stderr, /\(0 members\)/);
  } finally {
    rmrf(tmp);
  }
});

test('SessionStart: from a deeply nested child, still finds ecosystem via parent-walk', () => {
  const tmp = mktmp();
  try {
    const eco = path.join(tmp, 'deep');
    writeEcosystem(eco, 'deep');
    const nested = path.join(eco, 'initiatives', 'sub', 'sub2');
    fs.mkdirSync(nested, { recursive: true });
    const r = runHook(nested);
    assert.match(r.stderr, /▸ Ecosystem: deep/);
  } finally {
    rmrf(tmp);
  }
});

test('SessionStart: still prints handoff banner alongside ecosystem context', () => {
  const tmp = mktmp();
  try {
    const eco = path.join(tmp, 'demo');
    writeEcosystem(eco, 'demo');
    const member = path.join(tmp, 'mem');
    fs.mkdirSync(path.join(member, '.momentum', 'inbox'), { recursive: true });
    fs.writeFileSync(
      path.join(member, '.momentum', 'inbox', 'handoff-001.md'),
      [
        '## Summary',
        'Pick up the API wiring from the backend.',
        '',
        '**fromRepo:** /tmp/backend',
        '',
      ].join('\n'),
      'utf8',
    );
    const r = runHook(member);
    // status is 0 because we have no TTY (auto-skip)
    assert.equal(r.status, 0);
    assert.match(r.stderr, /▸ Ecosystem: demo/);
    assert.match(r.stderr, /▸ 1 pending handoff:/);
    assert.match(r.stderr, /Pick up the API wiring/);
  } finally {
    rmrf(tmp);
  }
});

test('SessionStart: broken ecosystem.json does not break the hook', () => {
  const tmp = mktmp();
  try {
    const eco = path.join(tmp, 'broken');
    fs.mkdirSync(eco, { recursive: true });
    fs.writeFileSync(path.join(eco, 'ecosystem.json'), '{ not json', 'utf8');
    const r = runHook(eco);
    assert.equal(r.status, 0, 'hook must not crash on bad JSON');
    // Best-effort: either silent, or prints "(unnamed)" — both are acceptable.
  } finally {
    rmrf(tmp);
  }
});
