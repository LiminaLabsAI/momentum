'use strict';

/**
 * `momentum doctor` — diagnose state + list available transitions.
 * Output reads as teaching, not jargon.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');
const {
  mkStandaloneRepo,
  mkEcosystemRoot,
  mkMemberRepo,
  mkLeaderAndMember,
  corruptManifest,
} = require('./helpers/ecosystem-fixtures');
const lib = require('../core/ecosystem/lib');

test('doctor — standalone state lists join and init --ecosystem', () => {
  const tmp = mktmp();
  try {
    const project = mkStandaloneRepo(path.join(tmp, 'solo'));
    lib._clearRootCache();
    const r = runCli(['doctor'], { cwd: project });
    assert.equal(r.status, 0, `doctor failed: ${r.stderr}`);
    assert.match(r.stdout, /State: Standalone/);
    assert.match(r.stdout, /momentum join/);
    assert.match(r.stdout, /momentum init --ecosystem/);
  } finally {
    rmrf(tmp);
  }
});

test('doctor — member state names the ecosystem and shows leave', () => {
  const tmp = mktmp();
  try {
    const project = mkMemberRepo(path.join(tmp, 'project'), 'demo');
    mkEcosystemRoot(path.join(tmp, 'demo'), 'demo', [
      { id: 'project', path: '../project', role: 'platform' },
    ]);
    lib._clearRootCache();
    const r = runCli(['doctor'], { cwd: project });
    assert.equal(r.status, 0, `doctor failed: ${r.stderr}`);
    assert.match(r.stdout, /State: Member/);
    assert.match(r.stdout, /Ecosystem: demo/);
    assert.match(r.stdout, /momentum leave/);
  } finally {
    rmrf(tmp);
  }
});

test('doctor — leader state shows ecosystem add/remove/status', () => {
  const tmp = mktmp();
  try {
    const ecoDir = mkEcosystemRoot(path.join(tmp, 'demo'), 'demo');
    lib._clearRootCache();
    const r = runCli(['doctor'], { cwd: ecoDir });
    assert.equal(r.status, 0, `doctor failed: ${r.stderr}`);
    assert.match(r.stdout, /State: Leader/);
    assert.match(r.stdout, /momentum ecosystem add/);
    assert.match(r.stdout, /momentum ecosystem status/);
  } finally {
    rmrf(tmp);
  }
});

test('doctor — broken-manifest state surfaces fix-or-remove guidance', () => {
  const tmp = mktmp();
  try {
    const ecoDir = mkEcosystemRoot(path.join(tmp, 'demo'), 'demo');
    corruptManifest(ecoDir);
    lib._clearRootCache();
    const r = runCli(['doctor'], { cwd: ecoDir });
    assert.equal(r.status, 0, `doctor failed: ${r.stderr}`);
    assert.match(r.stdout, /Broken \(manifest\)/);
    assert.match(r.stdout, /fix or remove/i);
  } finally {
    rmrf(tmp);
  }
});

test('doctor — broken-pointer recommends leave to recover', () => {
  const tmp = mktmp();
  try {
    // Pointer present but no matching ecosystem.
    const project = mkMemberRepo(path.join(tmp, 'orphan'), 'gone');
    lib._clearRootCache();
    const r = runCli(['doctor'], { cwd: project });
    assert.equal(r.status, 0, `doctor failed: ${r.stderr}`);
    assert.match(r.stdout, /Broken \(pointer\)/);
    assert.match(r.stdout, /momentum leave/);
  } finally {
    rmrf(tmp);
  }
});

test('doctor — output mentions cwd', () => {
  const tmp = mktmp();
  try {
    const project = mkStandaloneRepo(path.join(tmp, 'solo'));
    lib._clearRootCache();
    const r = runCli(['doctor'], { cwd: project });
    assert.equal(r.status, 0);
    // On macOS, /var and /private/var resolve the same; check for basename.
    assert.ok(r.stdout.includes('solo'));
  } finally {
    rmrf(tmp);
  }
});

test('doctor — leader-and-member shows both leader and member transitions', () => {
  const tmp = mktmp();
  try {
    const inner = path.join(tmp, 'inner');
    mkLeaderAndMember(inner, 'inner', 'outer');
    mkEcosystemRoot(path.join(tmp, 'outer'), 'outer', [
      { id: 'inner', path: '../inner', role: 'platform' },
    ]);
    lib._clearRootCache();
    const r = runCli(['doctor'], { cwd: inner });
    assert.equal(r.status, 0, `doctor failed: ${r.stderr}`);
    assert.match(r.stdout, /Leader\+Member/);
    assert.match(r.stdout, /momentum ecosystem add/);
    assert.match(r.stdout, /momentum leave/);
  } finally {
    rmrf(tmp);
  }
});
