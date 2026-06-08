'use strict';

/**
 * Phase 10 hard invariant — single-project use is identical to v0.12.0.
 *
 * `momentum init` (no flags, no adjacent ecosystem) must:
 *   1. produce the same set of files it did in Phase 9
 *   2. never write any `.momentum/` state related to ecosystem prompts
 *   3. never inject a pointer block
 *   4. never error or prompt
 *
 * The test runs in a tmpdir whose parent has NO ecosystem.json sibling,
 * so the auto-detect logic must short-circuit silently.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');
const lib = require('../core/ecosystem/lib');

test('momentum init — single-project use produces no ecosystem artifacts', () => {
  const tmp = mktmp();
  try {
    const project = path.join(tmp, 'solo-project');
    fs.mkdirSync(project);
    lib._clearRootCache();
    const r = runCli(['init'], { cwd: project });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);

    // CLAUDE.md must NOT contain a pointer block.
    const claudeMd = fs.readFileSync(path.join(project, 'CLAUDE.md'), 'utf8');
    assert.ok(
      !claudeMd.includes('<!-- ecosystem:begin'),
      'single-project init must NOT inject a pointer block',
    );

    // No skip-prompt file should exist (it is only written on declining).
    assert.ok(
      !fs.existsSync(path.join(project, '.momentum', 'skip-ecosystem-prompt')),
      'no skip-ecosystem-prompt file should be written',
    );

    // Stdout must contain none of the ecosystem-prompt cues.
    assert.ok(
      !/Detected ecosystem/.test(r.stdout),
      'auto-detect prompt must not fire when no sibling ecosystem exists',
    );

    // specs/ scaffold landed (Phase 9 baseline).
    assert.ok(fs.existsSync(path.join(project, 'specs', 'status.md')));
    assert.ok(fs.existsSync(path.join(project, 'specs', 'backlog', 'backlog.md')));
  } finally {
    rmrf(tmp);
  }
});

test('momentum init --no-ecosystem — bypass with no sibling ecosystem is a no-op', () => {
  const tmp = mktmp();
  try {
    const project = path.join(tmp, 'solo-project');
    fs.mkdirSync(project);
    lib._clearRootCache();
    const r = runCli(['init', '--no-ecosystem'], { cwd: project });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    // Behavior identical to the prior test — bypassing a prompt that
    // wouldn't have fired anyway is fine.
    const claudeMd = fs.readFileSync(path.join(project, 'CLAUDE.md'), 'utf8');
    assert.ok(!claudeMd.includes('<!-- ecosystem:begin'));
  } finally {
    rmrf(tmp);
  }
});

test('momentum init — adjacent ecosystem present, non-TTY: auto-detect silently skips', () => {
  const tmp = mktmp();
  try {
    // Set up an ecosystem sibling.
    const ecoDir = path.join(tmp, 'demo');
    fs.mkdirSync(ecoDir, { recursive: true });
    fs.writeFileSync(
      path.join(ecoDir, 'ecosystem.json'),
      JSON.stringify({ name: 'demo', version: 1, members: [] }, null, 2),
      'utf8',
    );

    const project = path.join(tmp, 'fresh-project');
    fs.mkdirSync(project);
    lib._clearRootCache();
    // runCli uses spawnSync with default stdio (pipes — no TTY).
    const r = runCli(['init'], { cwd: project });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);

    // No pointer block, no skip file — non-interactive: silent skip.
    const claudeMd = fs.readFileSync(path.join(project, 'CLAUDE.md'), 'utf8');
    assert.ok(!claudeMd.includes('<!-- ecosystem:begin'));
    assert.ok(
      !fs.existsSync(path.join(project, '.momentum', 'skip-ecosystem-prompt')),
      'non-TTY init should NOT write skip file (next interactive run can still prompt)',
    );
  } finally {
    rmrf(tmp);
  }
});
