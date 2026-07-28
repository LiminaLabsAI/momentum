'use strict';

/**
 * Phase 34 G2 — the surface.
 *
 * Two things get tested here that the library tests cannot cover:
 *
 * 1. **Reachability from the real binary.** BUG-033 shipped a correct library
 *    that nothing could invoke, inert in every install, with 1420 tests green.
 *    A library nobody can call is not shipped, so the CLI is exercised as a
 *    subprocess rather than by requiring the module.
 * 2. **That a proposal stays a proposal.** The whole design rests on this tool
 *    never acting on its own inference. If a draft can land in
 *    `specs/decisions/`, the safety story is gone regardless of how good the
 *    detector is.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, REPO_ROOT } = require('./_helpers');

const CLI = path.join(REPO_ROOT, 'bin', 'momentum.js');
const run = (...args) => spawnSync('node', [CLI, 'learnings', ...args],
  { cwd: REPO_ROOT, encoding: 'utf8' });

/** A project whose history declares a recurrence, with ids momentum never used. */
function fixtureRepo() {
  const dir = mktmp('momentum-learnings-');
  fs.mkdirSync(path.join(dir, 'specs', 'backlog'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'specs', 'phases', 'phase-1-x'), { recursive: true });
  write(path.join(dir, 'specs', 'backlog', 'backlog.md'),
    '| ID | Title | Priority | Status | Phase | Detail |\n' +
    '|----|-------|----------|--------|-------|--------|\n' +
    '| BUG-901 | first | P1 | resolved | 1 | a |\n' +
    '| BUG-902 | second | P1 | resolved | 1 | b |\n' +
    '| BUG-903 | third | P1 | resolved | 1 | Third instance of this shape (BUG-901, BUG-902). |\n' +
    '| BUG-904 | fourth | P1 | resolved | 1 | d |\n' +
    '| BUG-905 | fifth | P1 | resolved | 1 | e |\n');
  write(path.join(dir, 'specs', 'phases', 'phase-1-x', 'history.md'),
    '### [DISCOVERY] 2026-01-01 — again\n\n' +
    'Fifth instance of the same shape: BUG-901, BUG-902, BUG-903, BUG-904, BUG-905.\n');
  return dir;
}

test('momentum learnings is reachable from the real binary', () => {
  const r = run('--json');
  assert.equal(r.status, 0, r.stderr);
  const parsed = JSON.parse(r.stdout);
  assert.ok(Array.isArray(parsed.classes), '--json must emit a classes array');
  assert.equal(typeof parsed.threshold, 'number');
});

test('learnings reports this repo\'s own recurring class', () => {
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /recurrence/);
  // The class momentum has been paying for since BUG-002.
  assert.match(r.stdout, /BUG-031/);
});

test('a proposal is a DRAFT — it never lands in specs/decisions/', () => {
  const dir = fixtureRepo();
  try {
    const r = spawnSync('node', [CLI, 'learnings', '--propose', '--root', dir],
      { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);

    const proposed = path.join(dir, 'specs', 'decisions', 'proposed');
    const files = fs.readdirSync(proposed);
    assert.ok(files.length >= 1, 'a class over threshold must produce a draft');

    // The load-bearing assertion: nothing appears in the accepted set.
    const accepted = path.join(dir, 'specs', 'decisions');
    const loose = fs.readdirSync(accepted).filter((f) => f !== 'proposed');
    assert.deepEqual(loose, [],
      'a proposal must never be written into specs/decisions/ — only proposed/');

    const body = fs.readFileSync(path.join(proposed, files[0]), 'utf8');
    assert.match(body, /status: PROPOSED/, 'the draft must declare it is not accepted');
    assert.match(body, /not an\naccepted decision/, 'and say so in prose, for a human reader');
  } finally { rmrf(dir); }
});

test('a bare run never writes — reporting is the default', () => {
  const dir = fixtureRepo();
  try {
    const r = spawnSync('node', [CLI, 'learnings', '--root', dir],
      { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(fs.existsSync(path.join(dir, 'specs', 'decisions', 'proposed')), false,
      'without --propose nothing is written at all');
    assert.match(r.stdout, /momentum learnings --propose/, 'and it says how to opt in');
  } finally { rmrf(dir); }
});

test('learnings works on a project with no history at all', () => {
  // The common case for a fresh install. A tool that throws on an empty corpus
  // is a tool that breaks `momentum init` for everyone who never had a defect.
  const dir = mktmp('momentum-learnings-empty-');
  try {
    const r = spawnSync('node', [CLI, 'learnings', '--root', dir],
      { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /no recurring patterns found/);
  } finally { rmrf(dir); }
});

test('Rule 4 tells the agent to verify before acting on an inference', () => {
  // The rule text is the only thing that reaches an agent at phase start, so
  // the "advisory, verify first" framing has to survive there — not just in
  // this subsystem's own comments.
  const rules = fs.readFileSync(
    path.join(REPO_ROOT, 'core', 'instructions', 'rules-body.md'), 'utf8');
  const rule4 = rules.slice(rules.indexOf('### Rule 4'), rules.indexOf('### Rule 5'));
  assert.match(rule4, /momentum learnings/);
  assert.match(rule4, /advisory inferences, not measurements/i);
  assert.match(rule4, /never flip a\nstatus/i);
});
