#!/usr/bin/env node
'use strict';

/**
 * Re-baseline the per-adapter install fingerprints used by:
 *   - tests/claude-code-regression.test.js
 *   - tests/adapter-codex-fingerprint.test.js
 *   - tests/adapter-antigravity-fingerprint.test.js
 *
 * This is the "capture helper" those tests reference for INTENTIONAL
 * re-snapshots. It installs each adapter into a throwaway `fixture-project`
 * subdir (matching the tests' fixed-name pin for BUG-006 determinism),
 * fingerprints the tree exactly as the tests do, diffs against the committed
 * fixture, and (with --write) rewrites the fixture with updated meta.
 *
 * Dev-only: lives in root scripts/ which is NOT in package.json `files`, so it
 * never ships to npm.
 *
 * Usage:
 *   node scripts/capture-fingerprints.js            # check: print diff only
 *   node scripts/capture-fingerprints.js --write     # re-baseline fixtures
 *   node scripts/capture-fingerprints.js --write --note "why this changed"
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const CLI = path.join(REPO_ROOT, 'bin', 'momentum.js');

const ADAPTERS = [
  { agent: 'claude-code', fixture: 'v0.18.0-claude-code-fingerprint.json' },
  { agent: 'codex', fixture: 'v0.20.4-codex-fingerprint.json' },
  { agent: 'antigravity', fixture: 'v0.20.4-antigravity-fingerprint.json' },
];

function fingerprintInstall(targetDir) {
  const files = {};
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('._') || entry.name === '.DS_Store') continue;
      const abs = path.join(dir, entry.name);
      const rel = prefix ? path.join(prefix, entry.name) : entry.name;
      if (entry.isDirectory()) walk(abs, rel);
      else files[rel] = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    }
  };
  walk(targetDir, '');
  return files;
}

function captureAdapter(agent) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), `momentum-fp-${agent}-`));
  const target = path.join(tmpRoot, 'fixture-project');
  fs.mkdirSync(target);
  try {
    const res = spawnSync('node', [CLI, 'init', target, '--agent', agent], {
      encoding: 'utf8',
      timeout: 20000,
    });
    if (res.status !== 0) {
      throw new Error(`init --agent ${agent} failed: ${res.stderr || res.stdout}`);
    }
    return fingerprintInstall(target);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

function diff(oldFiles, newFiles) {
  const added = Object.keys(newFiles).filter((f) => !(f in oldFiles));
  const removed = Object.keys(oldFiles).filter((f) => !(f in newFiles));
  const drifted = Object.keys(newFiles).filter(
    (f) => f in oldFiles && oldFiles[f] !== newFiles[f]
  );
  return { added, removed, drifted };
}

function main() {
  const write = process.argv.includes('--write');
  const noteIdx = process.argv.indexOf('--note');
  const note = noteIdx !== -1 ? process.argv[noteIdx + 1] : null;
  const branch = (spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).stdout || '').trim();
  const today = new Date().toISOString().slice(0, 10);

  let anyChange = false;
  for (const { agent, fixture } of ADAPTERS) {
    const fixturePath = path.join(REPO_ROOT, 'tests', 'fixtures', fixture);
    const old = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const newFiles = captureAdapter(agent);
    const d = diff(old.files, newFiles);
    const changed = d.added.length || d.removed.length || d.drifted.length;
    if (changed) anyChange = true;

    console.log(`\n=== ${agent} (${fixture}) ===`);
    console.log(`  old files: ${Object.keys(old.files).length}  new files: ${Object.keys(newFiles).length}`);
    if (d.added.length) console.log(`  ADDED:   ${d.added.join(', ')}`);
    if (d.removed.length) console.log(`  REMOVED: ${d.removed.join(', ')}`);
    if (d.drifted.length) console.log(`  DRIFTED: ${d.drifted.join(', ')}`);
    if (!changed) console.log('  no change');

    if (write && changed) {
      const next = {
        meta: {
          captured: today,
          capturedFrom: branch || old.meta.capturedFrom,
          ...(old.meta.adapter ? { adapter: old.meta.adapter } : {}),
          note: note || old.meta.note,
        },
        files: newFiles,
      };
      fs.writeFileSync(fixturePath, JSON.stringify(next, null, 2) + '\n');
      console.log(`  -> re-baselined ${fixture}`);
    }
  }

  if (!write && anyChange) {
    console.log('\n(check mode — run with --write to re-baseline)');
  }
}

main();
