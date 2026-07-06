'use strict';

// Phase 22c (ADR-0007) — Multi-adapter lock file. Orphan cleanup is scoped
// per-agent: only the upgraded agent's files may be removed. The manifest
// stores agents[agent].files as a string array of relative paths.
// Safety invariant: only files momentum previously recorded as managed for
// the upgraded agent are ever removed; other agents' files + user files are
// never in scope.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, read, write } = require('./_helpers');

const MANIFEST_REL = path.join('.momentum', 'installed.json');
const readManifest = (t) => JSON.parse(read(path.join(t, MANIFEST_REL)));

test('upgrade — removes an orphaned managed file and backs it up', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);

    const orphan = path.join(target, '.claude', 'commands', 'retired-cmd.md');
    write(orphan, '# retired\n');
    const m = readManifest(target);
    // Phase 22c: files stored as simple string array under agents[agent].files
    m.agents['claude-code'].files.push('.claude/commands/retired-cmd.md');
    write(path.join(target, MANIFEST_REL), JSON.stringify(m, null, 2) + '\n');

    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, `upgrade failed: ${res.stderr}`);

    assert.ok(!fs.existsSync(orphan), 'orphan removed');
    assert.ok(fs.existsSync(orphan + '.bak'), 'orphan backed up to .bak');
    const after = readManifest(target);
    assert.ok(
      !after.agents['claude-code'].files.includes('.claude/commands/retired-cmd.md'),
      'orphan dropped from manifest'
    );
  } finally {
    rmrf(target);
  }
});

test('upgrade — never removes a user file not in the manifest', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);

    const userFile = path.join(target, '.claude', 'commands', 'my-notes.md');
    write(userFile, '# my notes\n');
    const userScript = path.join(target, 'scripts', 'my-custom.sh');
    write(userScript, '#!/bin/sh\necho hi\n');

    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, `upgrade failed: ${res.stderr}`);

    assert.ok(fs.existsSync(userFile), 'user command preserved');
    assert.equal(read(userFile), '# my notes\n', 'user command untouched');
    assert.ok(fs.existsSync(userScript), 'user script preserved');
  } finally {
    rmrf(target);
  }
});

test('init — BUG-008: re-init backs up a user-edited shipped file (no silent clobber)', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);

    const cmd = path.join(target, '.claude', 'commands', 'validate.md');
    const pristine = read(cmd);
    write(cmd, pristine + '\n<!-- USER EDIT -->\n');

    const res = runCli(['init', target]);
    assert.equal(res.status, 0, `re-init failed: ${res.stderr}`);

    assert.ok(fs.existsSync(cmd + '.bak'), 'edited file backed up to .bak');
    assert.match(read(cmd + '.bak'), /USER EDIT/, '.bak holds the user edit');
    assert.equal(read(cmd), pristine, 'shipped file restored to pristine template');
  } finally {
    rmrf(target);
  }
});

for (const { agent, file } of [
  { agent: 'claude-code', file: '.claude/settings.json' },
  { agent: 'codex', file: '.codex/hooks.json' },
  { agent: 'antigravity', file: '.agents/hooks.json' },
]) {
  test(`upgrade — ${agent} keeps adapter config (${file}) and tracks it`, () => {
    const target = mktmp();
    try {
      runCli(['init', target, '--agent', agent]);
      assert.ok(fs.existsSync(path.join(target, file)), `${file} present after init`);

      const res = runCli(['upgrade', target, '--agent', agent]);
      assert.equal(res.status, 0, `upgrade failed: ${res.stderr}`);

      assert.ok(
        fs.existsSync(path.join(target, file)),
        `${file} must survive upgrade (not orphaned)`
      );
      const m = readManifest(target);
      assert.ok(
        m.agents[agent].files.includes(file),
        `${file} must be recorded in the manifest`
      );
    } finally {
      rmrf(target);
    }
  });
}

test('init — fresh install makes no .bak files', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target]);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);

    const baks = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name.startsWith('._')) continue;
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.bak')) baks.push(path.relative(target, p));
      }
    };
    walk(target);
    assert.equal(baks.length, 0, `fresh init created .bak files: ${baks.join(', ')}`);
  } finally {
    rmrf(target);
  }
});
