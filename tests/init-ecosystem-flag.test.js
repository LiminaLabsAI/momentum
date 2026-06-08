'use strict';

/**
 * `momentum init --ecosystem <name>` — one-shot scaffold for first-member
 * + new ecosystem. Atomic-ish: on failure, partial state is rolled back.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');
const lib = require('../core/ecosystem/lib');
const stateLib = require('../core/ecosystem/lib/state');

test('init --ecosystem creates sibling ecosystem and registers this repo', () => {
  const tmp = mktmp();
  try {
    const project = path.join(tmp, 'first-project');
    fs.mkdirSync(project);
    lib._clearRootCache();
    const r = runCli(['init', '--ecosystem', 'demo-eco'], { cwd: project });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);

    // Ecosystem dir created as a sibling.
    const ecoDir = path.join(tmp, 'demo-eco');
    assert.ok(fs.existsSync(path.join(ecoDir, 'ecosystem.json')));
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ecoDir, 'ecosystem.json'), 'utf8'),
    );
    assert.equal(manifest.name, 'demo-eco');
    assert.equal(manifest.members.length, 1);
    assert.equal(path.resolve(ecoDir, manifest.members[0].path), project);

    // Pointer block injected into this project's CLAUDE.md.
    const claudeMd = fs.readFileSync(path.join(project, 'CLAUDE.md'), 'utf8');
    assert.match(claudeMd, /<!-- ecosystem:begin/);
    assert.match(claudeMd, /demo-eco/);

    // State machine confirms membership.
    lib._clearRootCache();
    assert.equal(stateLib.detectState(project), 'member');
  } finally {
    rmrf(tmp);
  }
});

test('init --ecosystem rejects invalid name', () => {
  const tmp = mktmp();
  try {
    const project = path.join(tmp, 'p');
    fs.mkdirSync(project);
    const r = runCli(['init', '--ecosystem', 'Bad_Name'], { cwd: project });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /name "Bad_Name"/);
  } finally {
    rmrf(tmp);
  }
});

test('init --ecosystem refuses when target ecosystem dir already exists', () => {
  const tmp = mktmp();
  try {
    fs.mkdirSync(path.join(tmp, 'preexisting'));
    const project = path.join(tmp, 'p');
    fs.mkdirSync(project);
    const r = runCli(['init', '--ecosystem', 'preexisting'], { cwd: project });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /already exists/i);
  } finally {
    rmrf(tmp);
  }
});
