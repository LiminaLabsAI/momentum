'use strict';

/**
 * `momentum selfcheck` — does momentum's own install still match what it ships?
 *
 * Phase 33. The sibling of `scripts/verify-published.sh`: that one checks what
 * USERS download, this one checks what MOMENTUM ITSELF runs. Both exist because
 * every other guard in the repo checks the working tree, and the working tree is
 * not where software fails.
 *
 * Reporting is the default. `--fix` is opt-in and prints what it changed,
 * because a checker that silently repairs hides the drift it exists to surface —
 * and drift is a symptom, not just an inconvenience: this repo was missing its
 * own Stop hook for the entire life of the feature that needs it.
 */

const fs = require('fs');
const path = require('path');

const MOMENTUM_ROOT = path.resolve(__dirname, '..');
const parity = require(path.join(MOMENTUM_ROOT, 'core', 'selfcheck', 'lib', 'parity'));

const USAGE = `momentum selfcheck — is this repo's install still what momentum ships?

Usage:
  momentum selfcheck [--adapter <name>] [--fix] [--json]

  --adapter <name>   default: claude-code (momentum installs itself as this)
  --fix              copy missing/changed files from source. OPT-IN.
  --json             machine shape

Exit 0 = no drift. Exit 1 = drift found (or --fix repaired it).
`;

function flag(args, name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function runSelfcheck(args) {
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(USAGE);
    return 0;
  }

  const adapter = flag(args, '--adapter', 'claude-code');
  const root = MOMENTUM_ROOT;
  const r = parity.check(root, adapter);

  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
    return parity.hasDrift(r) ? 1 : 0;
  }

  console.log(`▸ selfcheck — ${adapter} · ${r.checked} files in the shipped surface`);

  if (!parity.hasDrift(r)) {
    console.log('  ✓ no drift — this install matches what momentum ships');
    if (r.extra.length) {
      console.log('');
      console.log(`  ${r.extra.length} file(s) present that no install produces (informational):`);
      for (const f of r.extra) console.log(`    · ${f}`);
    }
    return 0;
  }

  if (r.missing.length) {
    console.log('');
    console.log(`  ✗ MISSING (${r.missing.length}) — shipped, but absent here:`);
    for (const f of r.missing) console.log(`    - ${f}`);
  }
  if (r.changed.length) {
    console.log('');
    console.log(`  ✗ CHANGED (${r.changed.length}) — present but stale vs source:`);
    for (const f of r.changed) console.log(`    ~ ${f}`);
  }

  if (!args.includes('--fix')) {
    console.log('');
    console.log('  Repair with:  momentum selfcheck --fix');
    console.log('  (reporting is the default — a checker that silently repairs hides the drift)');
    return 1;
  }

  // --fix: copy from source. Reads the SAME surface map the check just used, so
  // it cannot disagree with what it reported a moment ago.
  const surface = parity.expectedSurface(adapter);
  let repaired = 0;
  console.log('');
  for (const rel of [...r.missing, ...r.changed]) {
    const src = surface.get(rel);
    if (!src || !fs.existsSync(src)) {
      console.log(`    ! ${rel} — no source found, skipped`);
      continue;
    }
    const dest = path.join(root, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    if (rel.endsWith('.sh')) fs.chmodSync(dest, 0o755);
    console.log(`    ✓ ${rel}`);
    repaired += 1;
  }
  console.log('');
  console.log(`  Repaired ${repaired} file(s). Re-run without --fix to confirm.`);
  return 1;
}

module.exports = { runSelfcheck, USAGE };
