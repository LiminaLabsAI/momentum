'use strict';

/**
 * Phase 28 G2 — the ecosystem pointer reaches EVERY instruction file, not just
 * the preferred one (cause #2 of the CLAUDE.md/AGENTS.md divergence, ADR-0010).
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');
const pointer = require(path.join(REPO_ROOT, 'core', 'ecosystem', 'lib', 'pointer'));

function mktmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'momentum-pointer-all-')); }

/** A member repo `member/` beside an ecosystem root, with both instruction files. */
function makeMember() {
  const root = mktmp();
  const eco = path.join(root, 'eco');
  const member = path.join(root, 'member');
  fs.mkdirSync(eco, { recursive: true });
  fs.mkdirSync(member, { recursive: true });
  fs.writeFileSync(path.join(member, 'CLAUDE.md'), '# Project Rules: member\n\nManaged.\n');
  fs.writeFileSync(path.join(member, 'AGENTS.md'), '# Project Rules: member\n\nManaged.\n');
  return { root, eco, member };
}

test('findAllInstructionFiles returns every present candidate', () => {
  const { root, member } = makeMember();
  try {
    assert.deepEqual(pointer.findAllInstructionFiles(member).sort(), ['AGENTS.md', 'CLAUDE.md']);
    fs.rmSync(path.join(member, 'AGENTS.md'));
    assert.deepEqual(pointer.findAllInstructionFiles(member), ['CLAUDE.md']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('ensurePointerInjectedAll injects the pointer into CLAUDE.md AND AGENTS.md; idempotent', () => {
  const { root, eco, member } = makeMember();
  try {
    const touched = pointer.ensurePointerInjectedAll(member, eco, 'my-eco');
    assert.deepEqual(touched.sort(), ['AGENTS.md', 'CLAUDE.md']);

    for (const f of ['CLAUDE.md', 'AGENTS.md']) {
      const body = fs.readFileSync(path.join(member, f), 'utf8');
      assert.match(body, /ecosystem:begin/, `${f} has the pointer`);
      assert.match(body, /Member of `my-eco` ecosystem/, `${f} names the ecosystem`);
    }

    // idempotent: a second call doesn't duplicate the block
    pointer.ensurePointerInjectedAll(member, eco, 'my-eco');
    for (const f of ['CLAUDE.md', 'AGENTS.md']) {
      const body = fs.readFileSync(path.join(member, f), 'utf8');
      assert.equal((body.match(/ecosystem:begin/g) || []).length, 1, `${f} single block`);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('stripPointerAll removes the pointer from all files; reports only those that had one', () => {
  const { root, eco, member } = makeMember();
  try {
    pointer.ensurePointerInjectedAll(member, eco, 'my-eco');
    const stripped = pointer.stripPointerAll(member);
    assert.deepEqual(stripped.sort(), ['AGENTS.md', 'CLAUDE.md']);
    for (const f of ['CLAUDE.md', 'AGENTS.md']) {
      assert.doesNotMatch(fs.readFileSync(path.join(member, f), 'utf8'), /ecosystem:begin/);
    }
    // second strip: nothing had a pointer → empty report
    assert.deepEqual(pointer.stripPointerAll(member), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
