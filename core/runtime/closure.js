'use strict';

/**
 * The shipped runtime closure (Phase 31c G1, ADR-0018 R1).
 *
 * An installed momentum project receives no copy of `core/`, so anything a git
 * hook or shell script needs has to travel with it. Until 31c that constraint
 * was answered by hand-writing dependency-free MIRRORS of core logic — three of
 * them, which produced BUG-029 (a mirror that read the lane registry wrongly)
 * and, one tier along, BUG-030.
 *
 * The premise was never measured. The closure is ~96 kB against a 1.4 MB
 * package, and every file in it is already free of external dependencies, so it
 * copies verbatim. This module computes that closure from the ENTRY POINTS'
 * actual require graph, so it cannot drift from what the hooks really need:
 * add a require and the manifest test fails until the closure is recomputed.
 *
 * Layout in the target repo (R2):
 *
 *     <repo>/.momentum/runtime/<core-relative-path>
 *
 * `scripts/` and `.githooks/` both sit exactly one level below repo root, so
 * both reach it by the SAME literal relative path — `../.momentum/runtime/…`.
 * No resolver, no candidate list. A depth-1 assertion across adapters is what
 * licenses that (see tests/shipped-runtime.test.js).
 */

const fs = require('fs');
const path = require('path');

const CORE_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Where the runtime lands inside a target repo, relative to its root. */
const RUNTIME_DIR = path.join('.momentum', 'runtime');

/**
 * The modules hook-side code needs. Everything reachable from these is vendored.
 *
 * Keep this list minimal and justified — it is the *interface* between momentum's
 * core and its shipped runtime, and each addition widens what a target repo
 * carries.
 */
const ENTRY_POINTS = [
  // Ecosystem discovery + manifest reading (findRoot — the single resolver).
  'ecosystem/lib/index.js',
  // Event capture: the git-native write path (post-commit / post-merge / land).
  'ecosystem/lib/events.js',
  // Cross-repo coverage detection: the routing nudge + commit banner.
  'ecosystem/lib/detect.js',
  // Fleet orient: per-member phase / P0-P1 / lanes.
  'ecosystem/lib/orient.js',
  // Lane state — the authority `orient.js` mis-reimplemented in BUG-029.
  'lanes/lib/state.js',
  // Durable actor identity for event attribution.
  'identity/index.js',
  // Phase 32b / ADR-0020 — the scope grant, read by `pre-push` (run-check.js)
  // when no single-use sentinel is present. Listed EXPLICITLY because
  // run-check.js resolves it through a computed path rather than a static
  // require, so the closure walker below cannot discover it. Without this entry
  // the grant path would work in this checkout and silently do nothing in every
  // installed project — the BUG-030 shape, one layer down.
  'run/lib/grant.js',
  // Phase 32d — the GOVERNOR itself. `core/scripts/run-governor.sh` invokes
  // this file by PATH, so the closure walker (which follows static requires)
  // cannot discover it — the same blind spot that nearly shipped grant.js
  // non-functional in 32b, in this same list.
  //
  // Without this entry the interceptor backend is inert in every installed
  // project: the hook script ships, finds no hook.js, and exits 0. The governor
  // — the headline feature of the whole epic — would silently never fire
  // anywhere but the momentum repo itself. Caught by installing the published
  // tarball and running the hook, not by any test.
  'run/lib/hook.js',
];

/**
 * Files shipped alongside the closure that are not part of it (ADR-0018 R5).
 * `discover.js` is the shell-facing discovery entry point — `session-append.sh`
 * and `sessionstart-handoff.sh` invoke it instead of each carrying a bash
 * re-implementation of the walk.
 */
const EXTRAS = [{ src: path.join('runtime', 'discover.js'), dest: 'discover.js' }];

/** Resolve a relative require from `fromFile`, or null when it isn't a local file. */
function resolveRequire(fromFile, spec) {
  if (!spec.startsWith('.')) return null; // node builtin or package — not vendored
  let target = path.resolve(path.dirname(fromFile), spec);
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, 'index.js');
  } else if (!fs.existsSync(target) && fs.existsSync(`${target}.js`)) {
    target = `${target}.js`;
  }
  return fs.existsSync(target) ? target : null;
}

/**
 * Compute the closure: every `core/`-relative file reachable from ENTRY_POINTS.
 * Returned sorted, so the manifest is stable and diffs are readable.
 */
function computeClosure() {
  const seen = new Set();
  const queue = ENTRY_POINTS.map((rel) => path.join(CORE_ROOT, rel));

  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);

    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
      const dep = resolveRequire(file, m[1]);
      if (dep) queue.push(dep);
    }
  }

  return [...seen]
    .map((f) => path.relative(CORE_ROOT, f))
    .sort();
}

/** Absolute source path in this checkout for a closure entry. */
function sourcePath(rel) {
  return path.join(CORE_ROOT, rel);
}

/** Destination inside a target repo for a closure entry. */
function destPath(targetRoot, rel) {
  return path.join(targetRoot, RUNTIME_DIR, rel);
}

/**
 * Install (or refresh) the runtime in `targetRoot`.
 *
 * Verbatim copies — never transformed. A transformed copy is a second
 * implementation wearing a copy's clothes, which is the whole failure this
 * closes. `install()` reports what it wrote so callers can log it.
 */
function install(targetRoot, opts) {
  opts = opts || {};
  const written = [];
  // The shell-facing discovery entry point ships with the runtime it reads
  // (ADR-0018 R5) — `session-append.sh` and `sessionstart-handoff.sh` invoke it
  // instead of each carrying a bash re-implementation of the walk.
  const entries = [
    ...computeClosure().map((rel) => ({ src: rel, dest: rel })),
    // Lands FLAT at the runtime root so shell callers have a stable, obvious
    // path: `.momentum/runtime/discover.js`.
    ...EXTRAS,
  ];
  for (const { src: rel, dest: destRel } of entries) {
    const src = sourcePath(rel);
    const dest = path.join(targetRoot, RUNTIME_DIR, destRel);
    if (!fs.existsSync(src)) continue;
    if (!opts.dryRun) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    written.push(destRel);
  }
  return written;
}

module.exports = {
  CORE_ROOT,
  REPO_ROOT,
  RUNTIME_DIR,
  ENTRY_POINTS,
  EXTRAS,
  computeClosure,
  sourcePath,
  destPath,
  install,
};
