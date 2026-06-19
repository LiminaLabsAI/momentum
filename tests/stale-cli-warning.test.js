'use strict';

// Phase 20 — Upgrade Hardening, Group 2 (distribution).
// `momentum upgrade` copies files from the INSTALLED CLI, so a stale CLI can
// only install stale files. formatStaleCliWarning() returns a warning when the
// running CLI is behind the published latest, and null otherwise (D2 — warn,
// never block).

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { formatStaleCliWarning } = require('../bin/momentum');

test('warns when the installed CLI is behind the published latest', () => {
  const w = formatStaleCliWarning('0.20.2', '0.21.0');
  assert.ok(w, 'expected a warning string');
  assert.match(w, /0\.20\.2/);
  assert.match(w, /0\.21\.0/);
  assert.match(w, /@avinash-singh-io\/momentum@latest/);
  assert.match(w, /INSTALLED CLI/);
});

test('is silent when the CLI is current', () => {
  assert.equal(formatStaleCliWarning('0.21.0', '0.21.0'), null);
});

test('is silent when the version check was unavailable (null latest)', () => {
  assert.equal(formatStaleCliWarning('0.21.0', null), null);
});

test('is silent when the CLI is ahead of the published latest (dev build)', () => {
  assert.equal(formatStaleCliWarning('0.22.0', '0.21.0'), null);
});
