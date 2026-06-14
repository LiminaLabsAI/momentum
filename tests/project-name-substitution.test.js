'use strict';

/**
 * BUG-006 — momentum init/upgrade must substitute the literal <Project Name>
 * placeholder in the primary instruction file (CLAUDE.md / AGENTS.md) with the
 * real project name. Resolution order: package.json `name` (with @scope/ prefix
 * stripped) → directory basename → 'project'.
 *
 * Pre-fix: bin/momentum.js shipped the template byte-for-byte, so every
 * installed CLAUDE.md/AGENTS.md started with `# Project Rules: <Project Name>`.
 * Re-confirmed 2026-06-15 during the cerebrio dogfood across 5 member repos.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, read, write } = require('./_helpers');

test('init: substitutes <Project Name> with directory name when no package.json', () => {
  const tmp = mktmp();
  try {
    const projectDir = path.join(tmp, 'my-cool-project');
    fs.mkdirSync(projectDir);
    const r = runCli(['init'], { cwd: projectDir });
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    const claudeMd = read(path.join(projectDir, 'CLAUDE.md'));
    assert.equal(
      claudeMd.split('\n')[0],
      '# Project Rules: my-cool-project',
      'first line should have substituted directory name'
    );
    assert.doesNotMatch(
      claudeMd,
      /<Project Name>/,
      'literal placeholder should not appear anywhere in CLAUDE.md'
    );
  } finally {
    rmrf(tmp);
  }
});

test('init: substitutes <Project Name> with package.json name field', () => {
  const tmp = mktmp();
  try {
    const projectDir = path.join(tmp, 'wrong-dir-name');
    fs.mkdirSync(projectDir);
    write(
      path.join(projectDir, 'package.json'),
      JSON.stringify({ name: 'real-name-from-pkg', version: '0.0.1' })
    );
    const r = runCli(['init'], { cwd: projectDir });
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    const claudeMd = read(path.join(projectDir, 'CLAUDE.md'));
    assert.equal(
      claudeMd.split('\n')[0],
      '# Project Rules: real-name-from-pkg',
      'first line should use package.json name, not dir name'
    );
  } finally {
    rmrf(tmp);
  }
});

test('init: strips @scope/ prefix from scoped package.json name', () => {
  const tmp = mktmp();
  try {
    const projectDir = path.join(tmp, 'scoped-pkg-dir');
    fs.mkdirSync(projectDir);
    write(
      path.join(projectDir, 'package.json'),
      JSON.stringify({ name: '@my-org/cool-tool', version: '0.0.1' })
    );
    const r = runCli(['init'], { cwd: projectDir });
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    const claudeMd = read(path.join(projectDir, 'CLAUDE.md'));
    assert.equal(
      claudeMd.split('\n')[0],
      '# Project Rules: cool-tool',
      'scope prefix should be stripped'
    );
  } finally {
    rmrf(tmp);
  }
});

test('init --agent codex: substitutes <Project Name> in AGENTS.md', () => {
  const tmp = mktmp();
  try {
    const projectDir = path.join(tmp, 'codex-project');
    fs.mkdirSync(projectDir);
    const r = runCli(['init', '--agent', 'codex'], { cwd: projectDir });
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    const agentsMd = read(path.join(projectDir, 'AGENTS.md'));
    assert.equal(
      agentsMd.split('\n')[0],
      '# Project Rules: codex-project',
      'AGENTS.md first line should be substituted for codex adapter'
    );
    assert.doesNotMatch(agentsMd, /<Project Name>/);
  } finally {
    rmrf(tmp);
  }
});

test('upgrade: replaces stale <Project Name> placeholder in CLAUDE.md', () => {
  const tmp = mktmp();
  try {
    const projectDir = path.join(tmp, 'upgrade-target');
    fs.mkdirSync(projectDir);
    // Init once to lay down the full project scaffolding.
    const initR = runCli(['init'], { cwd: projectDir });
    assert.equal(initR.status, 0, `init stderr: ${initR.stderr}`);

    // Simulate a pre-fix v0.20.0-era install: replace the first line with
    // the literal placeholder so the test exercises the substitution path,
    // not just an idempotent re-copy.
    const claudePath = path.join(projectDir, 'CLAUDE.md');
    const sabotaged = read(claudePath).replace(
      /^# Project Rules: .+$/m,
      '# Project Rules: <Project Name>'
    );
    fs.writeFileSync(claudePath, sabotaged);

    const upgradeR = runCli(['upgrade'], { cwd: projectDir });
    assert.equal(upgradeR.status, 0, `upgrade stderr: ${upgradeR.stderr}`);
    const upgraded = read(claudePath);
    assert.doesNotMatch(
      upgraded,
      /<Project Name>/,
      'upgrade should have substituted the placeholder away'
    );
    assert.equal(
      upgraded.split('\n')[0],
      '# Project Rules: upgrade-target',
      'first line should be the resolved project name post-upgrade'
    );
  } finally {
    rmrf(tmp);
  }
});
