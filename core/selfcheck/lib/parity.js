'use strict';

/**
 * Phase 33 G0 — self-install surface parity.
 *
 * momentum installs itself. Nothing checked that its own installed surface still
 * matches what it ships — and on 2026-07-28 it did not: this repo was missing
 * its `Stop` hook, its cross-repo gate, and `scripts/run-governor.sh` entirely.
 * **momentum shipped a governor it could not itself run.**
 *
 * The existing guards do not cover this and were never meant to. Adapter
 * fingerprints (`tests/adapter-*-fingerprint.test.js`) verify that a FRESH
 * install matches the adapter. `scripts/verify-published.sh` verifies that the
 * PUBLISHED tarball works. Neither looks at the install momentum is actually
 * running from — the one install nobody checks, which is precisely why it
 * drifted furthest.
 *
 * PURE. `(root, adapterName) → {missing, changed, extra}`. No writes, no repair;
 * `momentum selfcheck --fix` is a separate, opt-in caller. Reporting is the
 * default because silently repairing would hide the drift this exists to
 * surface.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Files this repo legitimately carries that no install produces.
 *
 * `extra` is REPORTED, never condemned: momentum's own `scripts/` holds
 * development tooling (fingerprint capture, demos, the release smoke) that a
 * target project has no business receiving. A guard that flags those as drift
 * is a guard people learn to silence — and a silenced guard is how the three
 * defects above survived in the first place.
 */
const DEV_ONLY = Object.freeze([
  'scripts/capture-fingerprints.js',
  'scripts/capture-three-ideas-demo.sh',
  'scripts/demo-team.sh',
  'scripts/generate-instructions.js',
  'scripts/read-team-board.js',
  'scripts/rebaseline-fingerprints.js',
  'scripts/verify-published.sh',
]);

function sha(file) {
  try { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
  catch (_e) { return null; }
}

function listFiles(dir, base) {
  const out = [];
  const walk = (d) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch (_e) { return; }
    for (const e of entries) {
      if (e.name.startsWith('._') || e.name === '.DS_Store') continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      out.push(path.relative(base, full));
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * The surface a fresh install of `adapterName` produces, as
 * `Map<installedRelPath, sourceAbsPath>`.
 *
 * Derived from the adapter's OWN `destinations` and the runtime closure rather
 * than a second hand-written list. A re-derivation here would be exactly the
 * duplication ADR-0018 exists to end — and would drift from the installer it is
 * supposed to be checking.
 */
function expectedSurface(adapterName) {
  const surface = new Map();
  const adapterDir = path.join(REPO_ROOT, 'adapters', adapterName);
  const adapter = require(path.join(adapterDir, 'adapter.js'));
  const dests = adapter.destinations || {};

  // Shared recipes + scripts from core/, laid down at the adapter's destinations.
  const coreSources = { commands: 'commands', scripts: 'scripts' };
  for (const [key, coreSub] of Object.entries(coreSources)) {
    const dest = dests[key];
    if (!dest) continue;
    const src = path.join(REPO_ROOT, 'core', coreSub);
    for (const rel of listFiles(src, src)) {
      surface.set(path.join(...dest, rel), path.join(src, rel));
    }
  }

  // Adapter overlays win over core for the same destination.
  for (const [key, dest] of Object.entries(dests)) {
    const overlay = path.join(adapterDir, key);
    if (!fs.existsSync(overlay)) continue;
    for (const rel of listFiles(overlay, overlay)) {
      surface.set(path.join(...dest, rel), path.join(overlay, rel));
    }
  }

  // Declared config files (settings.json, hooks.json, plugins…).
  for (const cf of adapter.configFiles || []) {
    surface.set(path.join(...cf.destination), path.join(adapterDir, ...cf.source));
  }

  // The vendored runtime (ADR-0018) — the closure decides, not this module.
  const closure = require(path.join(REPO_ROOT, 'core', 'runtime', 'closure.js'));
  for (const rel of closure.computeClosure()) {
    surface.set(path.join('.momentum', 'runtime', rel), path.join(REPO_ROOT, 'core', rel));
  }
  for (const e of closure.EXTRAS) {
    surface.set(path.join('.momentum', 'runtime', e.dest), path.join(REPO_ROOT, 'core', e.src));
  }

  return surface;
}

/**
 * @param {string} root         repo to check (momentum's own root)
 * @param {string} adapterName  which adapter it installed itself as
 * @returns {{missing: string[], changed: string[], extra: string[], checked: number}}
 */
function check(root, adapterName) {
  const expected = expectedSurface(adapterName);
  const missing = [];
  const changed = [];

  for (const [rel, src] of expected) {
    const actual = path.join(root, rel);
    if (!fs.existsSync(actual)) { missing.push(rel); continue; }
    if (sha(actual) !== sha(src)) changed.push(rel);
  }

  // `extra` is scoped to the directories an install owns, and EXCLUDES generated
  // runtime state. `.momentum/` holds both: `runtime/` is install-owned, while
  // `run.json`, `config-cache.json`, `installed.json` and friends are working
  // state every install produces at runtime. Reporting those as drift would bury
  // the real signal under noise the operator can do nothing about.
  const owned = new Set();
  for (const rel of expected.keys()) owned.add(rel.split(path.sep)[0]);
  const extra = [];
  for (const top of owned) {
    const dir = path.join(root, top);
    if (!fs.existsSync(dir)) continue;
    for (const rel of listFiles(dir, root)) {
      if (expected.has(rel) || DEV_ONLY.includes(rel)) continue;
      // generated state under .momentum/ that is not the vendored runtime
      if (rel.startsWith(".momentum" + path.sep) && !rel.startsWith(path.join(".momentum", "runtime"))) continue;
      extra.push(rel);
    }
  }

  return {
    missing: missing.sort(),
    changed: changed.sort(),
    extra: extra.sort(),
    checked: expected.size,
  };
}

/** True when the install has drifted in a way that matters. `extra` does not. */
function hasDrift(result) {
  return result.missing.length > 0 || result.changed.length > 0;
}

module.exports = { check, hasDrift, DEV_ONLY };
