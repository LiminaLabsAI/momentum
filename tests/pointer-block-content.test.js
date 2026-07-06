'use strict';

/**
 * ENH-032 — Pointer block is now action-bearing (v=2): lists the
 * orchestration primitives and the cross-repo routing rule
 * ("write an initiative; never plan cross-repo features here").
 *
 * The v1 block was information-only ("Member of X ecosystem at ../X.")
 * — agents had no in-context signal of what to DO when planning
 * cross-repo work. v2 closes that gap.
 *
 * Existing members get migrated to v2 on the next `ensurePointerInjected`
 * touch (e.g. an idempotent re-add). This test exercises:
 *   - fresh insert writes v=2 form
 *   - v1 → v2 migration replaces the block in place
 *   - already-v2 is a no-op (preserves user customisations inside)
 *   - stripPointer removes both v1 and v2 forms
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, read, write } = require('./_helpers');
const pointer = require('../core/ecosystem/lib/pointer');

test('POINTER_VERSION is 2', () => {
  assert.equal(pointer.POINTER_VERSION, 2);
  assert.equal(pointer.POINTER_BEGIN, '<!-- ecosystem:begin v=2 -->');
});

test('fresh insert writes v=2 BEGIN sentinel and action-bearing content', () => {
  const tmp = mktmp();
  try {
    const claudePath = path.join(tmp, 'CLAUDE.md');
    write(claudePath, '# Member project\n\nSome body text.\n');
    const fakeRoot = path.join(tmp, 'eco-root');
    fs.mkdirSync(fakeRoot);

    pointer.ensurePointerInjected(tmp, 'CLAUDE.md', fakeRoot, 'my-eco');
    const after = read(claudePath);

    // v=2 sentinel.
    assert.match(after, /<!-- ecosystem:begin v=2 -->/);
    assert.match(after, /<!-- ecosystem:end -->/);

    // Action-bearing content: routing rule + primitives + status hint.
    assert.match(after, /Member of `my-eco` ecosystem/);
    assert.match(after, /Cross-repo work\?/);
    assert.match(after, /Write an initiative/);
    assert.match(after, /never plan cross-repo features in this repo/);
    assert.match(after, /\/initiative create/);
    assert.match(after, /\/scout/);
    assert.match(after, /\/dispatch/);
    assert.match(after, /\/handoff/);
    assert.match(after, /\/continue/);
    // Dispatch CLI caveat propagated to the member surface.
    assert.match(after, /momentum dispatch.*CLI is keyword-only/);
    assert.match(after, /momentum ecosystem status/);
  } finally {
    rmrf(tmp);
  }
});

test('v1 → v2 migration: legacy block replaced in place; surrounding content preserved', () => {
  const tmp = mktmp();
  try {
    const claudePath = path.join(tmp, 'CLAUDE.md');
    // Simulate a member that was registered under v1 and has body
    // content both above and below the legacy block.
    const v1Content = [
      '# Member',
      '',
      '<!-- ecosystem:begin -->',
      '> Member of `my-eco` ecosystem at `../my-eco`.',
      '> See ecosystem.json for siblings and `momentum ecosystem status` for live state.',
      '<!-- ecosystem:end -->',
      '',
      '## My Section',
      '',
      'Some content authored by the user that must survive migration.',
      '',
    ].join('\n');
    write(claudePath, v1Content);
    const fakeRoot = path.join(tmp, 'eco-root');
    fs.mkdirSync(fakeRoot);

    pointer.ensurePointerInjected(tmp, 'CLAUDE.md', fakeRoot, 'my-eco');
    const after = read(claudePath);

    // v=2 form replaced the v=1 block.
    assert.match(after, /<!-- ecosystem:begin v=2 -->/);
    assert.doesNotMatch(after, /<!-- ecosystem:begin -->/);
    // Only one BEGIN sentinel in the file (no duplication).
    const begins = after.match(/<!-- ecosystem:begin/g) || [];
    assert.equal(begins.length, 1, 'exactly one pointer block after migration');

    // User content above + below the legacy block is preserved.
    assert.match(after, /^# Member$/m);
    assert.match(after, /^## My Section$/m);
    assert.match(after, /Some content authored by the user/);

    // New action-bearing content present.
    assert.match(after, /Cross-repo work\?/);
    assert.match(after, /\/dispatch/);
  } finally {
    rmrf(tmp);
  }
});

test('already-v2 is a no-op (idempotent; preserves byte-identical content)', () => {
  const tmp = mktmp();
  try {
    const claudePath = path.join(tmp, 'CLAUDE.md');
    write(claudePath, '# Member\n');
    const fakeRoot = path.join(tmp, 'eco-root');
    fs.mkdirSync(fakeRoot);

    pointer.ensurePointerInjected(tmp, 'CLAUDE.md', fakeRoot, 'my-eco');
    const first = read(claudePath);
    pointer.ensurePointerInjected(tmp, 'CLAUDE.md', fakeRoot, 'my-eco');
    const second = read(claudePath);

    assert.equal(first, second, 'idempotent: re-injecting v2 is byte-identical');
  } finally {
    rmrf(tmp);
  }
});

test('stripPointer removes v=2 form cleanly', () => {
  const tmp = mktmp();
  try {
    const claudePath = path.join(tmp, 'CLAUDE.md');
    write(claudePath, '# Member\n');
    const fakeRoot = path.join(tmp, 'eco-root');
    fs.mkdirSync(fakeRoot);
    pointer.ensurePointerInjected(tmp, 'CLAUDE.md', fakeRoot, 'my-eco');
    pointer.stripPointer(claudePath);

    const after = read(claudePath);
    assert.doesNotMatch(after, /ecosystem:/);
    assert.match(after, /# Member/);
  } finally {
    rmrf(tmp);
  }
});

test('stripPointer removes legacy v=1 form cleanly (back-compat)', () => {
  const tmp = mktmp();
  try {
    const claudePath = path.join(tmp, 'CLAUDE.md');
    write(
      claudePath,
      '# Member\n\n<!-- ecosystem:begin -->\n> Legacy pointer.\n<!-- ecosystem:end -->\n\nBody text.\n',
    );
    pointer.stripPointer(claudePath);

    const after = read(claudePath);
    assert.doesNotMatch(after, /ecosystem:/);
    assert.match(after, /# Member/);
    assert.match(after, /Body text/);
  } finally {
    rmrf(tmp);
  }
});

test('hasPointerBlock returns true for both v=1 and v=2 forms', () => {
  const tmp = mktmp();
  try {
    // v1
    const v1Dir = path.join(tmp, 'v1');
    fs.mkdirSync(v1Dir);
    write(
      path.join(v1Dir, 'CLAUDE.md'),
      '# X\n\n<!-- ecosystem:begin -->\n> p\n<!-- ecosystem:end -->\n',
    );
    assert.equal(pointer.hasPointerBlock(v1Dir), true);

    // v2
    const v2Dir = path.join(tmp, 'v2');
    fs.mkdirSync(v2Dir);
    write(
      path.join(v2Dir, 'CLAUDE.md'),
      '# X\n\n<!-- ecosystem:begin v=2 -->\n> p\n<!-- ecosystem:end -->\n',
    );
    assert.equal(pointer.hasPointerBlock(v2Dir), true);

    // None
    const noneDir = path.join(tmp, 'none');
    fs.mkdirSync(noneDir);
    write(path.join(noneDir, 'CLAUDE.md'), '# X\n');
    assert.equal(pointer.hasPointerBlock(noneDir), false);
  } finally {
    rmrf(tmp);
  }
});

test('rel path "." used when ecosystem root equals the member (degenerate case)', () => {
  const tmp = mktmp();
  try {
    const claudePath = path.join(tmp, 'CLAUDE.md');
    write(claudePath, '# X\n');
    pointer.ensurePointerInjected(tmp, 'CLAUDE.md', tmp, 'self');
    const after = read(claudePath);
    assert.match(after, /at `\.`/);
    assert.match(after, /\.\/initiatives\/<NNNN-slug>\.md/);
  } finally {
    rmrf(tmp);
  }
});
