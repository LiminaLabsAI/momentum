'use strict';

/**
 * ENH-035 — `momentum ecosystem initiative create <slug>` ships as a
 * real CLI subcommand (promised "Phase 9 Group 2"; never landed until
 * Phase 15). Non-interactive — takes flags so it works from any agent
 * context without prompting.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');
const initLib = require('../core/ecosystem/lib/initiative');

function mkEcoWithMembers(tmp, members) {
  runCli(['ecosystem', 'init', 'eco'], { cwd: tmp });
  const root = path.join(tmp, 'eco');
  for (const id of members) {
    const memberDir = path.join(tmp, id);
    fs.mkdirSync(path.join(memberDir, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(memberDir, 'CLAUDE.md'), `# ${id}\n`, 'utf8');
    runCli(
      ['ecosystem', 'add', `../${id}`, '--role', 'other', '--id', id],
      { cwd: root },
    );
  }
  return root;
}

test('initiative create writes file + sets active', () => {
  const tmp = mktmp();
  try {
    const root = mkEcoWithMembers(tmp, ['a', 'b']);

    const r = runCli(
      [
        'ecosystem',
        'initiative',
        'create',
        'memory-module',
        '--why',
        'wire memory end-to-end across backend + frontend',
        '--repos',
        'a,b',
        '--owner',
        'test-owner',
      ],
      { cwd: root },
    );
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /Created initiatives\/0001-memory-module\.md/);
    assert.match(r.stdout, /Set as active initiative/);

    // File exists with right content.
    const filePath = path.join(root, 'initiatives', '0001-memory-module.md');
    assert.ok(fs.existsSync(filePath));
    const body = fs.readFileSync(filePath, 'utf8');
    assert.match(body, /^id: 1$/m);
    assert.match(body, /^slug: memory-module$/m);
    assert.match(body, /^owner: test-owner$/m);
    assert.match(body, /^repos: \[a, b\]$/m);
    assert.match(body, /^status: in-progress$/m);
    // User's --why substituted into the Why section.
    assert.match(body, /wire memory end-to-end across backend \+ frontend/);
    // Per-repo contribution stubs expanded.
    assert.match(body, /- \*\*a\*\*: …/);
    assert.match(body, /- \*\*b\*\*: …/);

    // Active marker set.
    assert.equal(initLib.getActive(root), 'memory-module');
  } finally {
    rmrf(tmp);
  }
});

test('initiative create rejects bad slug', () => {
  const tmp = mktmp();
  try {
    const root = mkEcoWithMembers(tmp, ['a']);
    const r = runCli(
      ['ecosystem', 'initiative', 'create', 'Bad_Slug'],
      { cwd: root },
    );
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /slug "Bad_Slug" must match/);
  } finally {
    rmrf(tmp);
  }
});

test('initiative create rejects --repos referring to unknown members', () => {
  const tmp = mktmp();
  try {
    const root = mkEcoWithMembers(tmp, ['a', 'b']);
    const r = runCli(
      ['ecosystem', 'initiative', 'create', 'oops', '--repos', 'a,doesnotexist'],
      { cwd: root },
    );
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /unknown member id\(s\): doesnotexist/);
  } finally {
    rmrf(tmp);
  }
});

test('initiative create defaults --repos to all members when omitted', () => {
  const tmp = mktmp();
  try {
    const root = mkEcoWithMembers(tmp, ['a', 'b', 'c']);
    const r = runCli(
      ['ecosystem', 'initiative', 'create', 'all-repos-default', '--owner', 'me'],
      { cwd: root },
    );
    assert.equal(r.status, 0, r.stderr);
    const body = fs.readFileSync(
      path.join(root, 'initiatives', '0001-all-repos-default.md'),
      'utf8',
    );
    assert.match(body, /^repos: \[a, b, c\]$/m);
  } finally {
    rmrf(tmp);
  }
});

test('initiative create errors when manifest is empty and --repos omitted', () => {
  const tmp = mktmp();
  try {
    runCli(['ecosystem', 'init', 'eco'], { cwd: tmp });
    const root = path.join(tmp, 'eco');
    const r = runCli(
      ['ecosystem', 'initiative', 'create', 'empty-members'],
      { cwd: root },
    );
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /ecosystem has no registered members yet/);
  } finally {
    rmrf(tmp);
  }
});

test('initiative create without --why leaves placeholder + warns', () => {
  const tmp = mktmp();
  try {
    const root = mkEcoWithMembers(tmp, ['a']);
    const r = runCli(
      ['ecosystem', 'initiative', 'create', 'no-why', '--owner', 'x'],
      { cwd: root },
    );
    assert.equal(r.status, 0);
    assert.match(
      r.stdout,
      /--why was not provided/,
      'stdout should warn that the Why section is a placeholder',
    );
    const body = fs.readFileSync(
      path.join(root, 'initiatives', '0001-no-why.md'),
      'utf8',
    );
    assert.match(body, /One short paragraph that captures the motivation/);
  } finally {
    rmrf(tmp);
  }
});

test('initiative create allocates monotonically increasing IDs', () => {
  const tmp = mktmp();
  try {
    const root = mkEcoWithMembers(tmp, ['a']);
    runCli(['ecosystem', 'initiative', 'create', 'first', '--owner', 'x'], { cwd: root });
    runCli(['ecosystem', 'initiative', 'create', 'second', '--owner', 'x'], { cwd: root });
    runCli(['ecosystem', 'initiative', 'create', 'third', '--owner', 'x'], { cwd: root });
    const files = fs.readdirSync(path.join(root, 'initiatives')).filter((n) => /^\d{4}-/.test(n)).sort();
    assert.deepEqual(files, ['0001-first.md', '0002-second.md', '0003-third.md']);
    // Active is the most recent.
    assert.equal(initLib.getActive(root), 'third');
  } finally {
    rmrf(tmp);
  }
});

test('initiative create works from inside a member repo (location-agnostic)', () => {
  const tmp = mktmp();
  try {
    const root = mkEcoWithMembers(tmp, ['a', 'b']);
    const r = runCli(
      [
        'ecosystem',
        'initiative',
        'create',
        'from-member',
        '--owner',
        'me',
      ],
      { cwd: path.join(tmp, 'a') }, // inside member, not root
    );
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(root, 'initiatives', '0001-from-member.md')));
  } finally {
    rmrf(tmp);
  }
});

test('initiative subsubcommand surfaces helpful error when missing or unknown', () => {
  const tmp = mktmp();
  try {
    const root = mkEcoWithMembers(tmp, ['a']);
    const r1 = runCli(['ecosystem', 'initiative'], { cwd: root });
    assert.notEqual(r1.status, 0);
    assert.match(r1.stderr, /missing subsubcommand/);

    const r2 = runCli(['ecosystem', 'initiative', 'list'], { cwd: root });
    assert.notEqual(r2.status, 0);
    assert.match(r2.stderr, /Only `create` is currently wired as a CLI/);
  } finally {
    rmrf(tmp);
  }
});

test('initiative create without slug arg produces remediation', () => {
  const tmp = mktmp();
  try {
    const root = mkEcoWithMembers(tmp, ['a']);
    const r = runCli(['ecosystem', 'initiative', 'create'], { cwd: root });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /missing <slug> positional argument/);
  } finally {
    rmrf(tmp);
  }
});

test('printUsage mentions the initiative subcommand', () => {
  const tmp = mktmp();
  try {
    const r = runCli(['ecosystem', '--help'], { cwd: tmp });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /initiative create/);
  } finally {
    rmrf(tmp);
  }
});
