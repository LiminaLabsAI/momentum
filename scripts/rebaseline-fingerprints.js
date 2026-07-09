'use strict';

/**
 * Re-baseline the 4 adapter install fingerprints (Phase 30d, ENH-064).
 *
 * The fingerprint tests (`tests/adapter-*-fingerprint.test.js`,
 * `tests/claude-code-regression.test.js`) assert a fresh install matches a
 * committed `{path: sha256}` fixture byte-for-byte. When a deliberate change to a
 * fingerprinted surface ships (a recipe, a rule, the installed .gitignore), the
 * fixtures must be regenerated IN THE SAME COMMIT with an explanatory note.
 *
 * Usage:
 *   node scripts/rebaseline-fingerprints.js --check   # report drift, write nothing
 *   node scripts/rebaseline-fingerprints.js --write --note "..."   # regenerate fixtures
 *
 * The capture logic mirrors each test's `fingerprintInstall` exactly (same
 * exclusions, same fixed `fixture-project` subdir for deterministic name
 * substitution).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { mktmp, rmrf, runCli, REPO_ROOT } = require('../tests/_helpers');

const ADAPTERS = [
  { agent: 'claude-code', fixture: 'v0.18.0-claude-code-fingerprint.json' },
  { agent: 'codex', fixture: 'v0.20.4-codex-fingerprint.json' },
  { agent: 'antigravity', fixture: 'v0.20.4-antigravity-fingerprint.json' },
  { agent: 'opencode', fixture: 'v0.28.0-opencode-fingerprint.json' },
];

function fingerprintInstall(targetDir) {
  const files = {};
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('._') || entry.name === '.DS_Store') continue;
      if (entry.name === '.momentum') continue;
      const abs = path.join(dir, entry.name);
      const rel = prefix ? path.join(prefix, entry.name) : entry.name;
      if (entry.isDirectory()) walk(abs, rel);
      else files[rel] = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    }
  };
  walk(targetDir, '');
  return files;
}

function capture(agent) {
  const tmpRoot = mktmp(`momentum-rebaseline-${agent}-`);
  const target = path.join(tmpRoot, 'fixture-project');
  fs.mkdirSync(target);
  try {
    const res = runCli(['init', target, '--agent', agent]);
    if (res.status !== 0) throw new Error(`init --agent ${agent} failed: ${res.stderr}`);
    return fingerprintInstall(target);
  } finally {
    rmrf(tmpRoot);
  }
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const noteIdx = args.indexOf('--note');
  const note = noteIdx >= 0 ? args[noteIdx + 1] : 'Phase 30d G0 — momentum claim in recipes + Rule 15 mechanism (ENH-064)';
  const today = new Date().toISOString().slice(0, 10);
  const branch = (() => {
    try { return require('child_process').execSync('git rev-parse --abbrev-ref HEAD', { cwd: REPO_ROOT }).toString().trim(); }
    catch { return 'unknown'; }
  })();

  let anyDrift = false;
  for (const { agent, fixture } of ADAPTERS) {
    const fixturePath = path.join(REPO_ROOT, 'tests', 'fixtures', fixture);
    const current = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const actual = capture(agent);

    const drift = [];
    for (const [f, h] of Object.entries(current.files)) {
      if (!(f in actual)) drift.push(`  - MISSING ${f}`);
      else if (actual[f] !== h) drift.push(`  ~ CHANGED ${f}`);
    }
    for (const f of Object.keys(actual)) if (!(f in current.files)) drift.push(`  + ADDED   ${f}`);

    if (drift.length === 0) {
      console.log(`✓ ${agent}: no drift (${Object.keys(actual).length} files)`);
    } else {
      anyDrift = true;
      console.log(`△ ${agent}: ${drift.length} change(s)`);
      drift.forEach((d) => console.log(d));
      if (write) {
        const next = { meta: { captured: today, capturedFrom: branch, adapter: agent, note }, files: actual };
        fs.writeFileSync(fixturePath, JSON.stringify(next, null, 2) + '\n');
        console.log(`  → rewrote ${fixture}`);
      }
    }
  }
  if (!write && anyDrift) console.log('\n(--check only; run with --write --note "..." to regenerate)');
  process.exit(0);
}

main();
