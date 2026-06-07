'use strict';

/**
 * `momentum init` auto-detect — when a sibling ecosystem exists, prompt
 * once. Declining writes `.momentum/skip-ecosystem-prompt` so the
 * prompt never fires again. `--no-ecosystem` bypasses the prompt
 * entirely. Non-TTY environments (CI, scripts) skip silently.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');
const lib = require('../core/ecosystem/lib');

function writeEcosystemSibling(parent, name) {
  const ecoDir = path.join(parent, name);
  fs.mkdirSync(ecoDir, { recursive: true });
  fs.mkdirSync(path.join(ecoDir, 'initiatives'), { recursive: true });
  fs.mkdirSync(path.join(ecoDir, 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(ecoDir, '.state'), { recursive: true });
  fs.writeFileSync(
    path.join(ecoDir, 'ecosystem.json'),
    JSON.stringify({ name, version: 1, created: '2026-06-07', members: [], dependencies: [] }, null, 2) + '\n',
    'utf8',
  );
}

test('init --no-ecosystem with adjacent ecosystem: bypasses prompt', () => {
  const tmp = mktmp();
  try {
    writeEcosystemSibling(tmp, 'eco');
    const project = path.join(tmp, 'project');
    fs.mkdirSync(project);
    lib._clearRootCache();
    const r = runCli(['init', '--no-ecosystem'], { cwd: project });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);

    // No pointer, no skip file — explicit bypass.
    const claudeMd = fs.readFileSync(path.join(project, 'CLAUDE.md'), 'utf8');
    assert.ok(!claudeMd.includes('<!-- ecosystem:begin -->'));
    assert.ok(!fs.existsSync(path.join(project, '.momentum', 'skip-ecosystem-prompt')));
  } finally {
    rmrf(tmp);
  }
});

test('init pre-existing skip-ecosystem-prompt: prompt does not fire', () => {
  const tmp = mktmp();
  try {
    writeEcosystemSibling(tmp, 'eco');
    const project = path.join(tmp, 'project');
    fs.mkdirSync(project);
    // Pre-seed the skip file (simulates a prior decline).
    fs.mkdirSync(path.join(project, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(project, '.momentum', 'skip-ecosystem-prompt'), 'pre-existing\n', 'utf8');
    lib._clearRootCache();

    const r = runCli(['init'], { cwd: project });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);

    // Skip file preserved; no pointer injected; no prompt cues in stdout.
    const skipContent = fs.readFileSync(path.join(project, '.momentum', 'skip-ecosystem-prompt'), 'utf8');
    assert.equal(skipContent, 'pre-existing\n', 'pre-existing skip file must not be rewritten');
    const claudeMd = fs.readFileSync(path.join(project, 'CLAUDE.md'), 'utf8');
    assert.ok(!claudeMd.includes('<!-- ecosystem:begin -->'));
    assert.ok(!/Detected ecosystem/.test(r.stdout));
  } finally {
    rmrf(tmp);
  }
});

test('init non-TTY: silent skip even with adjacent ecosystem (no skip file written)', () => {
  const tmp = mktmp();
  try {
    writeEcosystemSibling(tmp, 'eco');
    const project = path.join(tmp, 'project');
    fs.mkdirSync(project);
    lib._clearRootCache();
    // spawnSync inherits piped stdio (non-TTY by default in runCli).
    const r = runCli(['init'], { cwd: project });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    assert.ok(
      !fs.existsSync(path.join(project, '.momentum', 'skip-ecosystem-prompt')),
      'non-TTY init must NOT write skip file — a later interactive run can still prompt',
    );
    assert.ok(!/Detected ecosystem/.test(r.stdout));
  } finally {
    rmrf(tmp);
  }
});

test('init with multiple adjacent ecosystems still produces no automatic registration in non-TTY', () => {
  const tmp = mktmp();
  try {
    writeEcosystemSibling(tmp, 'eco-one');
    writeEcosystemSibling(tmp, 'eco-two');
    const project = path.join(tmp, 'project');
    fs.mkdirSync(project);
    lib._clearRootCache();
    const r = runCli(['init'], { cwd: project });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    // Non-TTY: nothing happens. Neither ecosystem registers the project.
    for (const name of ['eco-one', 'eco-two']) {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(tmp, name, 'ecosystem.json'), 'utf8'),
      );
      assert.equal(manifest.members.length, 0, `${name} must remain empty`);
    }
  } finally {
    rmrf(tmp);
  }
});
