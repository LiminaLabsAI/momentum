'use strict';

/**
 * `momentum join` / `momentum leave` — idempotent state transitions
 * runnable from inside the member repo.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');
const {
  mkStandaloneRepo,
  mkEcosystemRoot,
} = require('./helpers/ecosystem-fixtures');
const lib = require('../core/ecosystem/lib');
const stateLib = require('../core/ecosystem/lib/state');

test('join → leave → join → leave roundtrip preserves clean state', () => {
  const tmp = mktmp();
  try {
    const project = mkStandaloneRepo(path.join(tmp, 'project'));
    const ecoDir = mkEcosystemRoot(path.join(tmp, 'demo'), 'demo');
    lib._clearRootCache();

    // 1. join
    let r = runCli(['join', ecoDir], { cwd: project });
    assert.equal(r.status, 0, `join failed: ${r.stderr}`);
    lib._clearRootCache();
    assert.equal(stateLib.detectState(project), 'member');

    // 2. leave
    r = runCli(['leave'], { cwd: project });
    assert.equal(r.status, 0, `leave failed: ${r.stderr}`);
    lib._clearRootCache();
    assert.equal(stateLib.detectState(project), 'standalone');

    // 3. join again
    r = runCli(['join', ecoDir], { cwd: project });
    assert.equal(r.status, 0, `re-join failed: ${r.stderr}`);
    lib._clearRootCache();
    assert.equal(stateLib.detectState(project), 'member');

    // 4. leave again
    r = runCli(['leave'], { cwd: project });
    assert.equal(r.status, 0, `re-leave failed: ${r.stderr}`);
    lib._clearRootCache();
    assert.equal(stateLib.detectState(project), 'standalone');
  } finally {
    rmrf(tmp);
  }
});

test('join is idempotent — re-joining the same ecosystem is a clean no-op', () => {
  const tmp = mktmp();
  try {
    const project = mkStandaloneRepo(path.join(tmp, 'project'));
    const ecoDir = mkEcosystemRoot(path.join(tmp, 'demo'), 'demo');
    lib._clearRootCache();

    runCli(['join', ecoDir], { cwd: project });
    const r2 = runCli(['join', ecoDir], { cwd: project });
    assert.equal(r2.status, 0, `idempotent join failed: ${r2.stderr}`);
    assert.match(r2.stdout, /Already a member/i);

    // Manifest still has exactly one member.
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ecoDir, 'ecosystem.json'), 'utf8'),
    );
    assert.equal(manifest.members.length, 1);
  } finally {
    rmrf(tmp);
  }
});

test('leave on a standalone repo is a clean no-op', () => {
  const tmp = mktmp();
  try {
    const project = mkStandaloneRepo(path.join(tmp, 'solo'));
    lib._clearRootCache();
    const r = runCli(['leave'], { cwd: project });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Already standalone/i);
  } finally {
    rmrf(tmp);
  }
});

test('join refuses when this dir is itself an ecosystem root', () => {
  const tmp = mktmp();
  try {
    const ecoDir = mkEcosystemRoot(path.join(tmp, 'demo'), 'demo');
    const other = mkEcosystemRoot(path.join(tmp, 'other'), 'other');
    lib._clearRootCache();
    const r = runCli(['join', other], { cwd: ecoDir });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /ecosystem root/i);
    assert.match(r.stderr, /ecosystem add/);
  } finally {
    rmrf(tmp);
  }
});

test('join with missing arg surfaces remediation', () => {
  const tmp = mktmp();
  try {
    const project = mkStandaloneRepo(path.join(tmp, 'project'));
    const r = runCli(['join'], { cwd: project });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /missing <ecosystem-path>/);
    assert.match(r.stderr, /doctor/);
  } finally {
    rmrf(tmp);
  }
});
