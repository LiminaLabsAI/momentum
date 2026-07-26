'use strict';

// Phase 31c G1 — the shipped runtime (ADR-0018 R1/R2/R4).
//
// An installed project receives no copy of `core/`. Until 31c that was answered
// by hand-writing dependency-free MIRRORS of core logic, which produced BUG-029
// (a mirror that read the lane registry wrongly) and, one tier along, BUG-030.
//
// The runtime replaces mirrors with VERBATIM COPIES. That distinction is the
// whole point: a copy can be asserted byte-identical, so drift is impossible
// rather than merely detectable — unlike a parity fence, which only notices
// after someone has already written the duplicate.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');
const closure = require('../core/runtime/closure');

const REPO_ROOT = path.resolve(__dirname, '..');
const ADAPTERS = ['claude-code', 'codex', 'antigravity', 'opencode'];

// ─────────────────────────────────────────────────────────────────────────────
// The closure is computed, not hand-listed
// ─────────────────────────────────────────────────────────────────────────────

test('the closure is derived from the entry points real require graph', () => {
  const files = closure.computeClosure();
  assert.ok(files.length > 0);

  // Every entry point must be in its own closure.
  for (const entry of closure.ENTRY_POINTS) {
    assert.ok(files.includes(entry), `entry point missing from closure: ${entry}`);
  }

  // Every file must exist and be requireable from this checkout.
  for (const rel of files) {
    const src = closure.sourcePath(rel);
    assert.ok(fs.existsSync(src), `closure names a missing file: ${rel}`);
    assert.doesNotThrow(() => require(src), `closure member does not load: ${rel}`);
  }
});

test('the closure is transitively complete — no member requires outside it', () => {
  // This is what makes the manifest self-maintaining: add a require to any
  // runtime module and this fails until the closure genuinely covers it, so
  // widening what a target repo carries is always a deliberate act.
  const files = new Set(closure.computeClosure());
  for (const rel of files) {
    const src = fs.readFileSync(closure.sourcePath(rel), 'utf8');
    for (const m of src.matchAll(/require\(['"](\.[^'"]+)['"]\)/g)) {
      let dep = path.resolve(path.dirname(closure.sourcePath(rel)), m[1]);
      if (fs.existsSync(dep) && fs.statSync(dep).isDirectory()) dep = path.join(dep, 'index.js');
      else if (!fs.existsSync(dep) && fs.existsSync(`${dep}.js`)) dep = `${dep}.js`;
      if (!fs.existsSync(dep)) continue;
      const depRel = path.relative(closure.CORE_ROOT, dep);
      assert.ok(files.has(depRel),
        `${rel} requires ${depRel}, which is not in the closure — recompute it`);
    }
  }
});

test('the closure contains no external dependencies', () => {
  // Vendoring only works because momentum is zero-dependency. A package require
  // in the closure would ship a module that cannot resolve in a target repo.
  for (const rel of closure.computeClosure()) {
    const src = fs.readFileSync(closure.sourcePath(rel), 'utf8');
    for (const m of src.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
      const spec = m[1];
      if (spec.startsWith('.')) continue;
      const builtin = spec.replace(/^node:/, '');
      assert.ok(
        ['fs', 'path', 'os', 'child_process', 'crypto', 'util', 'url', 'assert'].includes(builtin),
        `${rel} requires non-builtin '${spec}' — it cannot be vendored`);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — byte-identity
// ─────────────────────────────────────────────────────────────────────────────

test('AC-3: every installed runtime file is byte-identical to its core original', () => {
  const tmp = mktmp();
  try {
    const target = path.join(tmp, 'proj');
    fs.mkdirSync(target, { recursive: true });
    assert.equal(runCli(['init', '.', '--agent', 'claude-code'], { cwd: target }).status, 0);

    const files = closure.computeClosure();
    assert.ok(files.length > 0);
    for (const rel of files) {
      const dest = closure.destPath(target, rel);
      assert.ok(fs.existsSync(dest), `runtime not installed: ${rel}`);
      assert.deepEqual(
        fs.readFileSync(dest),
        fs.readFileSync(closure.sourcePath(rel)),
        `${rel} differs from its core original — the runtime must be a verbatim copy`);
    }
  } finally { rmrf(tmp); }
});

test('upgrade refreshes the runtime so hooks match the installed momentum', () => {
  const tmp = mktmp();
  try {
    const target = path.join(tmp, 'proj');
    fs.mkdirSync(target, { recursive: true });
    assert.equal(runCli(['init', '.', '--agent', 'claude-code'], { cwd: target }).status, 0);

    // Corrupt a vendored file, as a stale install would be.
    const victim = closure.destPath(target, closure.ENTRY_POINTS[0]);
    fs.writeFileSync(victim, '// stale\n');

    assert.equal(runCli(['upgrade', '.'], { cwd: target }).status, 0);
    assert.deepEqual(
      fs.readFileSync(victim),
      fs.readFileSync(closure.sourcePath(closure.ENTRY_POINTS[0])),
      'upgrade must restore byte-identity');
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// R2 — the literal relative path, and the constraint it takes on
// ─────────────────────────────────────────────────────────────────────────────

test('R2: hooks and scripts install exactly one level below repo root', () => {
  // This is what licenses the literal `../.momentum/runtime/…` require. If a
  // future adapter installs at another depth, that path silently mis-resolves,
  // so the constraint is asserted rather than assumed.
  for (const agent of ADAPTERS) {
    const tmp = mktmp();
    try {
      const target = path.join(tmp, 'proj');
      fs.mkdirSync(target, { recursive: true });
      const res = runCli(['init', '.', '--agent', agent], { cwd: target });
      assert.equal(res.status, 0, `${agent}: ${res.stderr || res.stdout}`);

      for (const dir of ['scripts', '.githooks']) {
        const full = path.join(target, dir);
        if (!fs.existsSync(full)) continue;
        const rel = path.relative(target, full);
        assert.equal(rel.split(path.sep).length, 1,
          `${agent}: ${dir} must be exactly one level below repo root (got '${rel}')`);
        // …and from there, the literal path must resolve to the runtime.
        assert.ok(
          fs.existsSync(path.resolve(full, '..', '.momentum', 'runtime')),
          `${agent}: ../.momentum/runtime must resolve from ${dir}`);
      }
    } finally { rmrf(tmp); }
  }
});

test('R2: the runtime preserves core-relative subpaths so intra-closure requires work', () => {
  const tmp = mktmp();
  try {
    const target = path.join(tmp, 'proj');
    fs.mkdirSync(target, { recursive: true });
    assert.equal(runCli(['init', '.', '--agent', 'claude-code'], { cwd: target }).status, 0);

    // Requiring a vendored module must work IN PLACE — its own relative requires
    // resolve only if the tree shape was preserved.
    const runtimeIndex = closure.destPath(target, 'ecosystem/lib/index.js');
    assert.doesNotThrow(() => {
      const mod = require(runtimeIndex);
      assert.equal(typeof mod.findRoot, 'function');
    }, 'a vendored module must load from its installed location');
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// R4 — committed, so a fresh clone works
// ─────────────────────────────────────────────────────────────────────────────

test('AC-6/R4: the runtime is git-trackable, not ignored', () => {
  const tmp = mktmp();
  try {
    const target = path.join(tmp, 'proj');
    fs.mkdirSync(target, { recursive: true });
    const { execFileSync } = require('node:child_process');
    execFileSync('git', ['init', '-q'], { cwd: target });
    assert.equal(runCli(['init', '.', '--agent', 'claude-code'], { cwd: target }).status, 0);

    // `git check-ignore -v` prints matched NEGATIONS too and exits 0, so it is
    // the wrong instrument here. `add --dry-run` is the real answer.
    const out = execFileSync('git', ['add', '--dry-run', '.momentum/runtime/'],
      { cwd: target, encoding: 'utf8' });
    const added = out.split('\n').filter((l) => l.startsWith('add '));
    assert.ok(added.length >= closure.computeClosure().length,
      `expected every runtime file to be trackable, git would add ${added.length}`);
  } finally { rmrf(tmp); }
});

test('the gitignore template negates the runtime directory', () => {
  const tpl = fs.readFileSync(
    path.join(REPO_ROOT, 'core', 'specs-templates', '.gitignore'), 'utf8');
  assert.match(tpl, /^!\.momentum\/runtime\/$/m);
  assert.match(tpl, /^!\.momentum\/runtime\/\*\*$/m);
});
