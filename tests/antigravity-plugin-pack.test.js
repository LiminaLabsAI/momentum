'use strict';

/**
 * Phase 22b G3 — `momentum antigravity plugin-pack` + doctor advisory.
 *
 * The packer assembles momentum's skills as a native Antigravity plugin
 * (`plugins/momentum/plugin.json` + `skills/`, vendor layout per
 * fact-sheet §6; validated live with `agy plugin validate` — see
 * evidence/plugin-pack.md). Hooks are deliberately NOT packed (plugin
 * hooks run with CWD = the plugin dir; momentum's hook commands are
 * project-relative). momentum never provisions the agy binary.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');

const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS = [
  'momentum-orient',
  'momentum-reviewer-architecture',
  'momentum-reviewer-qa',
  'momentum-reviewer-security',
  'swarm-supervisor',
];

test('plugin-pack assembles plugin.json + all skills at .agents/plugins/momentum/', () => {
  const dir = mktmp('momentum-plugin-pack-');
  try {
    const res = runCli(['antigravity', 'plugin-pack', dir]);
    assert.equal(res.status, 0, `plugin-pack failed: ${res.stderr}`);
    const base = path.join(dir, '.agents', 'plugins', 'momentum');
    const manifest = JSON.parse(fs.readFileSync(path.join(base, 'plugin.json'), 'utf8'));
    assert.equal(manifest.name, 'momentum');
    for (const skill of SKILLS) {
      const skillMd = path.join(base, 'skills', skill, 'SKILL.md');
      assert.ok(fs.existsSync(skillMd), `expected ${skillMd}`);
      assert.match(fs.readFileSync(skillMd, 'utf8'), /^---\nname:/, `${skill} frontmatter`);
    }
    assert.ok(!fs.existsSync(path.join(base, 'hooks.json')),
      'hooks must NOT be packed (project-relative commands)');
  } finally {
    rmrf(dir);
  }
});

test('plugin-pack --dry-run writes nothing', () => {
  const dir = mktmp('momentum-plugin-dry-');
  try {
    const res = runCli(['antigravity', 'plugin-pack', dir, '--dry-run']);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /would write/);
    assert.ok(!fs.existsSync(path.join(dir, '.agents')), 'dry-run must not create files');
  } finally {
    rmrf(dir);
  }
});

test('plugin-pack --global targets the vendor global discovery root (home override)', () => {
  const fakeHome = mktmp('momentum-plugin-home-');
  try {
    const res = runCli(['antigravity', 'plugin-pack', '--global'], {
      env: { ...process.env, MOMENTUM_HOME_OVERRIDE: fakeHome },
    });
    assert.equal(res.status, 0, `plugin-pack --global failed: ${res.stderr}`);
    const base = path.join(fakeHome, '.gemini', 'config', 'plugins', 'momentum');
    assert.ok(fs.existsSync(path.join(base, 'plugin.json')), 'global plugin.json expected');
    assert.ok(fs.existsSync(path.join(base, 'skills', 'momentum-orient', 'SKILL.md')));
    assert.match(res.stdout, /every Antigravity workspace/);
  } finally {
    rmrf(fakeHome);
  }
});

test('doctor advises the official agy installer for antigravity projects when agy is missing', () => {
  const dir = mktmp('momentum-doctor-agy-');
  try {
    runCli(['init', dir, '--agent', 'antigravity']);
    const res = runCli(['doctor'], {
      cwd: dir,
      env: { ...process.env, AGY_BIN: '/nonexistent/agy' },
    });
    assert.match(res.stdout, /targets Antigravity but the `agy` CLI is not on PATH/);
    assert.match(res.stdout, /antigravity\.google\/cli\/install\.sh/);
    assert.ok(!/provision/i.test(res.stdout), 'doctor must only advise, never provision');
  } finally {
    rmrf(dir);
  }
});

test('doctor stays silent about agy for claude-code projects', () => {
  const dir = mktmp('momentum-doctor-claude-');
  try {
    runCli(['init', dir, '--agent', 'claude-code']);
    const res = runCli(['doctor'], {
      cwd: dir,
      env: { ...process.env, AGY_BIN: '/nonexistent/agy' },
    });
    assert.ok(!/agy/.test(res.stdout), 'no agy advisory for non-antigravity projects');
  } finally {
    rmrf(dir);
  }
});
