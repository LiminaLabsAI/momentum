'use strict';

// Phase 20 — Upgrade Hardening, Group 1 (ENH-040).
// `--dry-run` previews the action set for init/upgrade and writes NOTHING.
// The hard guarantee under test: zero filesystem mutations (no files, no .bak,
// no manifest, no orphan removal) and a clean exit.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { mktmp, rmrf, runCli, read, write } = require('./_helpers');

function snapshot(dir) {
  const files = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('._') || e.name === '.git') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else files[path.relative(dir, p)] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    }
  };
  walk(dir);
  return files;
}

test('init --dry-run — writes zero files and exits 0', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--dry-run']);
    assert.equal(res.status, 0, `dry-run init failed: ${res.stderr}`);
    assert.match(res.stdout, /dry run — no files will be written/i);
    assert.match(res.stdout, /no files were written/i);

    const files = Object.keys(snapshot(target));
    assert.equal(files.length, 0, `dry-run wrote files: ${files.join(', ')}`);
    assert.ok(!fs.existsSync(path.join(target, '.momentum', 'installed.json')), 'no lock file written');
  } finally {
    rmrf(target);
  }
});

for (const agent of ['claude-code', 'codex', 'antigravity']) {
  test(`upgrade --dry-run — leaves a ${agent} repo byte-for-byte unchanged`, () => {
    const target = mktmp();
    try {
      runCli(['init', target, '--agent', agent]);
      const before = snapshot(target);

      const res = runCli(['upgrade', target, '--agent', agent, '--dry-run']);
      assert.equal(res.status, 0, `dry-run upgrade failed: ${res.stderr}`);

      const after = snapshot(target);
      assert.deepEqual(after, before, 'dry-run upgrade must not change any file');

      const baks = Object.keys(after).filter((f) => f.endsWith('.bak'));
      assert.equal(baks.length, 0, `dry-run created .bak files: ${baks.join(', ')}`);
    } finally {
      rmrf(target);
    }
  });
}

test('upgrade --dry-run — reports an orphan would be removed but does not remove it', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);

    const orphan = path.join(target, '.claude', 'commands', 'retired-cmd.md');
    write(orphan, '# retired\n');
    const manifestPath = path.join(target, '.momentum', 'installed.json');
    const m = JSON.parse(read(manifestPath));
    // Phase 22c: files stored as string array under agents[agent].files
    m.agents['claude-code'].files.push('.claude/commands/retired-cmd.md');
    write(manifestPath, JSON.stringify(m, null, 2) + '\n');
    const before = snapshot(target);

    const res = runCli(['upgrade', target, '--dry-run']);
    assert.equal(res.status, 0, `dry-run upgrade failed: ${res.stderr}`);
    assert.match(res.stdout, /would remove.*retired-cmd\.md/);

    assert.ok(fs.existsSync(orphan), 'orphan must still exist after dry-run');
    assert.deepEqual(snapshot(target), before, 'dry-run must not mutate anything');
  } finally {
    rmrf(target);
  }
});
