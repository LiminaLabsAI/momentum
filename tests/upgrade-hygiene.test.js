'use strict';

/**
 * Phase 27 G4 — upgrade/transform hygiene. The codex/opencode skills generators
 * used to mint `._<name>/SKILL.md` junk dirs from AppleDouble sidecars (whose
 * names end with `.md`); `momentum doctor --clean` sweeps stray AppleDouble /
 * `.bak` / orphan-worktree litter.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, runCli, REPO_ROOT } = require('./_helpers');

const codex = require(path.join(REPO_ROOT, 'adapters', 'codex', 'adapter'));
const doctor = require(path.join(REPO_ROOT, 'bin', 'state-commands'));

test('codex skills transform skips AppleDouble `._*.md` (no junk skill dir)', () => {
  const target = mktmp('momentum-transform-');
  try {
    const commandsDir = path.join(target, '.codex', 'commands');
    write(path.join(commandsDir, 'complete-phase.md'), 'Real recipe.\n');
    write(path.join(commandsDir, '._complete-phase.md'), '\x00\x05AppleDouble junk');
    write(path.join(commandsDir, '.DS_Store'), 'junk');

    codex.transformCommandsIntoSkills(target, null);

    const skillsRoot = path.join(target, '.agents', 'skills');
    assert.ok(fs.existsSync(path.join(skillsRoot, 'complete-phase', 'SKILL.md')), 'real skill generated');
    const dirs = fs.readdirSync(skillsRoot);
    assert.ok(!dirs.some((d) => d.startsWith('._')), `no ._* junk skill dir (got: ${dirs.join(', ')})`);
    assert.ok(!dirs.includes('.DS_Store'));
  } finally {
    rmrf(target);
  }
});

test('a fresh codex install carries no AppleDouble entries', () => {
  const target = mktmp('momentum-codex-clean-');
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, res.stderr);
    const found = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === '.git' || e.name === 'node_modules') continue;
        if (e.name.startsWith('._') || e.name === '.DS_Store') found.push(path.join(d, e.name));
        else if (e.isDirectory()) walk(path.join(d, e.name));
      }
    };
    walk(target);
    assert.deepEqual(found, [], `install left AppleDouble litter: ${found.join(', ')}`);
  } finally {
    rmrf(target);
  }
});

test('doctor --clean finds stray AppleDouble/.bak/orphan-worktree; --execute removes them', () => {
  const container = mktmp('momentum-doctor-clean-');
  const dir = path.join(container, 'proj');
  fs.mkdirSync(dir);
  const git = (...a) => assert.equal(spawnSync('git', a, { cwd: dir }).status, 0);
  spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  spawnSync('git', ['config', 'user.email', 't@e.com'], { cwd: dir });
  spawnSync('git', ['config', 'user.name', 'T'], { cwd: dir });
  try {
    write(path.join(dir, 'README.md'), 'x\n');
    git('add', '-A'); spawnSync('git', ['commit', '-q', '--no-verify', '-m', 'init'], { cwd: dir });

    // seed cruft
    write(path.join(dir, '.agents', 'skills', '._complete-phase', 'SKILL.md'), 'junk');
    write(path.join(dir, '.claude', 'commands', 'start-phase.md.bak'), 'old');
    write(path.join(dir, 'CLAUDE.md.bak'), 'old');
    fs.mkdirSync(path.join(dir, '.claude', 'worktrees', 'orphan-xyz'), { recursive: true });

    const found = doctor.findStrayArtifacts(dir);
    assert.ok(found.appleDouble.some((p) => p.includes('._complete-phase')));
    assert.ok(found.baks.some((p) => p.endsWith('start-phase.md.bak')));
    assert.ok(found.baks.some((p) => p.endsWith('CLAUDE.md.bak')));
    assert.ok(found.orphanWorktreeDirs.some((p) => p.endsWith('orphan-xyz')));

    // dry-run leaves everything
    doctor.sweepStrayArtifacts(dir, false);
    assert.ok(fs.existsSync(path.join(dir, 'CLAUDE.md.bak')), 'dry-run kept files');

    // execute removes
    doctor.sweepStrayArtifacts(dir, true);
    assert.ok(!fs.existsSync(path.join(dir, 'CLAUDE.md.bak')));
    assert.ok(!fs.existsSync(path.join(dir, '.agents', 'skills', '._complete-phase')));
    assert.ok(!fs.existsSync(path.join(dir, '.claude', 'commands', 'start-phase.md.bak')));
    assert.ok(!fs.existsSync(path.join(dir, '.claude', 'worktrees', 'orphan-xyz')));
  } finally {
    rmrf(container);
  }
});
