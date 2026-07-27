'use strict';

/**
 * Phase 32a G5 — the orphan-export guard.
 *
 * `tests/production-call-path.test.js` (Phase 31c, ADR-0018 R6) catches one
 * defect shape: a function with an INJECTABLE root that every test injects and
 * production must discover. BUG-031 is a different shape entirely —
 *
 *     an exported function with NO production caller at all.
 *
 * `pollTurn` held the whole of `--mode autopilot` and was green for a year
 * because its only callers were tests. `recordRepoComplete` likewise. No
 * `poll` subcommand ever existed. The R6 guard could not have caught this: the
 * functions take no injectable root, so they were never in its scan.
 *
 * This guard is the complement. It enumerates every export under `core/run/`
 * and requires each to be referenced from somewhere that is NOT a test and NOT
 * its own defining file. Adding a new export without wiring it fails here, in
 * the same commit, rather than a year later in a backlog entry.
 *
 * Scoped to `core/run/` deliberately. Extending it repo-wide would be a large
 * change with a long tail of legacy findings, and this phase's obligation is to
 * not repeat the defect it was named after. Widening the scope is 32d's call,
 * once swarm's dead runner is actually removed.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const REPO_ROOT = path.resolve(__dirname, '..');
/**
 * Phase 32d G0 — WIDENED beyond core/run/.
 *
 * 32c found this guard blind to single-line `module.exports` and therefore
 * green over four modules for two phases. Repairing the regex was half the
 * debt; the other half is running it over the surface it should always have
 * covered. `core/swarm/` is where BUG-031 actually lived, and
 * `core/ecosystem/` is the other subsystem with hook-side entry points.
 */
const SCANNED = [
  path.join(REPO_ROOT, 'core', 'run', 'lib'),
  path.join(REPO_ROOT, 'core', 'swarm'),
  path.join(REPO_ROOT, 'core', 'ecosystem', 'lib'),
];
const RUN_LIB = SCANNED[0];

/** Directories that count as PRODUCTION — a reference here proves reachability. */
const PRODUCTION_DIRS = ['bin', 'core', 'adapters', 'scripts'];

// ─────────────────────────────────────────────────────────────────────────────

function listJs(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        // The vendored runtime is a byte-copy of core (ADR-0018) — counting it
        // would let a file "prove" its own reachability against its own mirror.
        if (full.includes(`.momentum${path.sep}runtime`)) continue;
        walk(full);
        continue;
      }
      if (e.name.endsWith('.js')) out.push(full);
    }
  };
  walk(dir);
  return out;
}

/**
 * Exported names from a module, read from its `module.exports = { ... }` block.
 * Textual rather than by `require()` so a syntax error surfaces as a failure
 * here rather than crashing the test file.
 */
function exportsOf(file) {
  const src = fs.readFileSync(file, 'utf8');

  // Both shapes, and the single-line one is NOT optional. The first version of
  // this required `\n};` — so every module ending
  // `module.exports = { a, b };` on one line contributed ZERO exports and the
  // guard reported green over code it could not see. `backend.js`, `lock.js`,
  // `grant.js` and `amend.js` were all invisible to it. A guard with a silent
  // blind spot is worse than no guard: it converts "unchecked" into "checked
  // and fine".
  const m = src.match(/module\.exports\s*=\s*\{([\s\S]*?)\}\s*;/);
  if (!m) return [];
  return m[1]
    .split(/[\n,]/)                              // single-line exports are comma-separated
    .map((l) => l.replace(/\/\/.*$/, '').trim())
    .filter(Boolean)
    .map((l) => {
      const name = l.match(/^([A-Za-z0-9_]+)\s*[,:]?/);
      return name ? name[1] : null;
    })
    .filter(Boolean);
}

function productionFiles() {
  const files = [];
  for (const d of PRODUCTION_DIRS) {
    const full = path.join(REPO_ROOT, d);
    if (fs.existsSync(full)) files.push(...listJs(full));
  }
  // Shell scripts count too — run-governor.sh is how the interceptor backend
  // actually reaches hook.js, and that reference is not JavaScript.
  const scriptDir = path.join(REPO_ROOT, 'core', 'scripts');
  if (fs.existsSync(scriptDir)) {
    for (const e of fs.readdirSync(scriptDir)) {
      if (e.endsWith('.sh')) files.push(path.join(scriptDir, e));
    }
  }
  return files;
}

/**
 * Is `name` referenced from production, outside the file that defines it?
 * A reference is a call, a property access, or a destructure.
 */
function referencedInProduction(name, definingFile, corpus) {
  const patterns = [
    new RegExp(`\\.${name}\\s*\\(`),          // lib.name(
    new RegExp(`\\.${name}\\b`),              // lib.name
    new RegExp(`\\b${name}\\s*[,}]`),         // { name } destructure
    new RegExp(`\\b${name}\\s*\\(`),          // bare call after destructure
  ];
  for (const { file, src } of corpus) {
    if (file === definingFile) continue;
    if (patterns.some((p) => p.test(src))) return file;
  }
  return null;
}

/**
 * Is this file itself a production entry point — invoked as a script rather
 * than imported? `hook.js` is reached by `run-governor.sh` invoking the FILE;
 * no production JavaScript ever names its exports. Treating that as an orphan
 * would flag the entire interceptor backend and teach everyone to ignore the
 * guard, which is how a guard becomes decoration.
 *
 * The bar is deliberately narrow: the file must BOTH self-invoke
 * (`require.main === module`) AND be named by a production script. A file that
 * merely self-invokes proves nothing.
 */
function isWiredEntryPoint(file, corpus) {
  const src = fs.readFileSync(file, 'utf8');
  if (!/require\.main\s*===\s*module/.test(src)) return false;
  const base = path.basename(file);
  return corpus.some(({ file: f, src: s }) => f !== file && s.includes(base));
}

function scanRunExports() {
  const corpus = productionFiles().map((f) => ({ file: f, src: fs.readFileSync(f, 'utf8') }));
  const orphans = [];
  const reached = [];

  const files = SCANNED.filter((d) => fs.existsSync(d)).flatMap(listJs);
  for (const file of files) {
    const rel = path.relative(REPO_ROOT, file);
    if (isWiredEntryPoint(file, corpus)) {
      reached.push({ name: '(entry point)', file: rel, by: 'invoked as a script' });
      continue;
    }
    for (const name of exportsOf(file)) {
      const where = referencedInProduction(name, file, corpus);
      if (where) reached.push({ name, file: rel, by: path.relative(REPO_ROOT, where) });
      else orphans.push({ name, file: rel });
    }
  }
  return { orphans, reached };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Legacy orphan budget for the subsystems widened into in 32d.
 *
 * `core/run/` is held at ZERO — it is this epic's code and there is no excuse.
 * `core/swarm/` and `core/ecosystem/` carry a pre-existing tail that predates
 * the guard, and fixing ~30 legacy exports is a different phase's work with a
 * different blast radius.
 *
 * So this is a RATCHET, not an amnesty: the count may fall, never rise. Adding a
 * new orphan to swarm or ecosystem fails here, while the existing tail is
 * recorded honestly rather than hidden behind a narrower scan. 32d's G1 removal
 * lowers it; nothing may raise it.
 */
const LEGACY_ORPHAN_BUDGET = 87; // measured 2026-07-27; may fall, never rise

test('BUG-031 GUARD: core/run has ZERO orphans — this epic\'s own code', () => {
  // The debt 32c named: the guard was blind to single-line exports and green
  // over backend.js / lock.js / grant.js / amend.js for two phases. This is the
  // re-run that makes 32a's and 32b's "guard clean" claims earned rather than
  // asserted.
  const { orphans, reached } = scanRunExports();
  assert.ok(reached.length > 0, 'a scan that finds nothing passes vacuously');

  const runOrphans = orphans.filter((o) => o.file.startsWith(path.join('core', 'run')));
  assert.deepEqual(
    runOrphans.map((o) => `${o.file}:${o.name}`),
    [],
    'These exports have NO production caller — only tests can reach them.\n'
    + 'That is exactly how swarm\'s pollTurn stayed green for a year while\n'
    + '`--mode autopilot` never ran (BUG-031). Either wire it to a production\n'
    + 'entry point, or stop exporting it:\n  '
    + runOrphans.map((o) => `${o.file}:${o.name}`).join('\n  ')
  );
});

test('BUG-031 GUARD: the legacy tail ratchets down, never up', () => {
  const { orphans } = scanRunExports();
  const legacy = orphans.filter((o) => !o.file.startsWith(path.join('core', 'run')));
  assert.ok(
    legacy.length <= LEGACY_ORPHAN_BUDGET,
    `legacy orphan count rose to ${legacy.length} (budget ${LEGACY_ORPHAN_BUDGET}).\n`
    + 'The tail may shrink, never grow. New orphans:\n  '
    + legacy.map((o) => `${o.file}:${o.name}`).join('\n  ')
  );
});

test('BUG-031 GUARD: the guard actually detects an orphan', () => {
  // A guard nobody has seen fail is a guard nobody knows works — which is the
  // whole lesson of this phase. Prove the detector red on a synthetic orphan
  // rather than trusting that it would fire.
  const tmpFile = path.join(RUN_LIB, '__orphan_probe__.js');
  fs.writeFileSync(tmpFile, [
    "'use strict';",
    '// Temporary fixture — written and removed inside this test.',
    'function zzzUnreachableProbeFn() { return 1; }',
    'module.exports = {',
    '  zzzUnreachableProbeFn,',
    '};',
    '',
  ].join('\n'), 'utf8');

  try {
    const { orphans } = scanRunExports();
    assert.ok(
      orphans.some((o) => o.name === 'zzzUnreachableProbeFn'),
      'the guard failed to flag a deliberately unreachable export — it would not have caught pollTurn either'
    );
  } finally {
    fs.unlinkSync(tmpFile);
  }

  // ...and core/run goes clean again once the orphan is gone.
  const after = scanRunExports().orphans
    .filter((o) => o.file.startsWith(path.join('core', 'run')));
  assert.deepEqual(after, []);
});

test('BUG-031 GUARD: the shell entry point counts as production', () => {
  // hook.js is reached only from run-governor.sh — a JS-only corpus would call
  // the whole interceptor backend an orphan and teach everyone to ignore the
  // guard.
  const { reached } = scanRunExports();
  const hookReach = reached.find((r) => r.file.endsWith(path.join('run', 'lib', 'hook.js')));
  assert.ok(hookReach, 'hook.js exports must be seen as reachable');
});

test('the swarm functions BUG-031 named are still orphans — and still deprecated', () => {
  // Not a failure: D13 says deprecate now, remove in 32d. This asserts the
  // deprecation notice stays attached until the removal happens, so the
  // known-dead code cannot quietly lose its warning label.
  const src = fs.readFileSync(path.join(REPO_ROOT, 'core', 'swarm', 'conductor.js'), 'utf8');
  assert.match(src, /@deprecated[\s\S]{0,400}NO PRODUCTION CALLER/,
    'pollTurn must keep its deprecation notice until 32d removes it');
  assert.match(src, /BUG-031/);
});
