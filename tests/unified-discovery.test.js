'use strict';

// Phase 31c G0 — unified ecosystem-root discovery (ADR-0018 R3), which fixes
// BUG-030.
//
// Before 31c there were SEVEN discovery implementations across three algorithms,
// and the broken one was the exported API: `lib.findRoot` walked UP ONLY, while
// `core/ecosystem/layout.md` documents the ecosystem root as a SIBLING of its
// members — which is what `ecosystem init` + `ecosystem add ../repo` produce.
//
// `landing.js` had no fallback, so in that standard layout `momentum lanes land`
// silently skipped the whole cross-repo gate: v0.41.0 shipped ENH-068, its
// headline deliverable, non-functional.
//
// The BUG-030 test below drives the PRODUCTION call path — `landingCheck(dir)`
// with no injected root — because injecting the root is precisely what every 31b
// test did, and precisely why the bug shipped.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, write } = require('./_helpers');
const lib = require('../core/ecosystem/lib');
const landing = require('../core/ecosystem/lib/landing');

const REPO_ROOT = path.resolve(__dirname, '..');

/** Ecosystem root as a SIBLING of its members — the layout `init`+`add` create. */
function siblingLayout() {
  const tmp = mktmp();
  assert.equal(runCli(['ecosystem', 'init', 'eco'], { cwd: tmp }).status, 0);
  const root = path.join(tmp, 'eco');
  const dirs = {};
  for (const [id, role] of [['backend', 'platform'], ['frontend', 'client']]) {
    const dir = path.join(tmp, id);
    fs.mkdirSync(path.join(dir, 'specs'), { recursive: true });
    write(path.join(dir, 'CLAUDE.md'), `# ${id}\n`);
    write(path.join(dir, 'specs', 'status.md'), 'x\n');
    assert.equal(
      runCli(['ecosystem', 'add', `../${id}`, '--role', role, '--id', id], { cwd: root }).status, 0);
    dirs[id] = dir;
  }
  return { tmp, root, dirs };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUG-030 — the production call path
// ─────────────────────────────────────────────────────────────────────────────

test('BUG-030: the landing gate applies with NO injected root', () => {
  const { tmp, root, dirs } = siblingLayout();
  try {
    assert.equal(runCli(['ecosystem', 'initiative', 'create', 'attachments',
      '--why', 'w', '--repos', 'backend,frontend', '--owner', 'ada'], { cwd: root }).status, 0);
    assert.equal(runCli(['ecosystem', 'initiative', 'start', 'attachments',
      '--contribute', 'backend:phase:p12',
      '--contribute', 'frontend:adhoc:a1',
      '--edge', 'frontend:backend:api-contract'], { cwd: root }).status, 0);

    // THE production call: no ecosystemRoot. Pre-31c this returned
    // applicable:false and the gate was skipped entirely.
    const res = landing.landingCheck(dirs.frontend);
    assert.equal(res.applicable, true,
      'the gate must apply without an injected root — that is how lanes land calls it');
    assert.equal(res.ok, false, 'frontend is downstream of backend, which has not landed');
    assert.equal(res.blockers[0].member, 'backend');

    // …and it must agree with the injected-root form, which is all 31b proved.
    const injected = landing.landingCheck(dirs.frontend, { ecosystemRoot: root });
    assert.equal(injected.applicable, res.applicable);
    assert.equal(injected.ok, res.ok);
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// findRoot: all three strategies
// ─────────────────────────────────────────────────────────────────────────────

test('findRoot: sibling root is found from a member repo', () => {
  const { tmp, root, dirs } = siblingLayout();
  try {
    assert.equal(lib.findRoot(dirs.backend), path.resolve(root));
    assert.equal(lib.findRoot(path.join(dirs.backend, 'specs')), path.resolve(root),
      'and from a subdirectory of a member');
  } finally { rmrf(tmp); }
});

test('findRoot: up-walk still works (the ecosystem root itself and below)', () => {
  const { tmp, root } = siblingLayout();
  try {
    assert.equal(lib.findRoot(root), path.resolve(root));
    const sub = path.join(root, 'initiatives');
    fs.mkdirSync(sub, { recursive: true });
    assert.equal(lib.findRoot(sub), path.resolve(root));
  } finally { rmrf(tmp); }
});

test('findRoot: returns null outside any ecosystem', () => {
  const tmp = mktmp();
  try {
    const lonely = path.join(tmp, 'solo', 'nested');
    fs.mkdirSync(lonely, { recursive: true });
    assert.equal(lib.findRoot(lonely), null);
    assert.equal(lib.findRoot(''), null);
    assert.equal(lib.findRoot(undefined), null);
  } finally { rmrf(tmp); }
});

test('findRoot: does not mistake a member for the root', () => {
  const { tmp, root, dirs } = siblingLayout();
  try {
    // A member dir contains no ecosystem.json; the sibling scan must not return
    // the member itself, only the dir that actually holds the manifest.
    assert.notEqual(lib.findRoot(dirs.frontend), path.resolve(dirs.frontend));
    assert.equal(lib.findRoot(dirs.frontend), path.resolve(root));
  } finally { rmrf(tmp); }
});

test('findRoot: honours MOMENTUM_MAX_PARENT_WALK', () => {
  const { tmp, dirs } = siblingLayout();
  const prev = process.env.MOMENTUM_MAX_PARENT_WALK;
  try {
    // Bust the memo cache by using a deeper, unseen start path.
    const deep = path.join(dirs.backend, 'a', 'b', 'c', 'd', 'e', 'f');
    fs.mkdirSync(deep, { recursive: true });
    process.env.MOMENTUM_MAX_PARENT_WALK = '1';
    assert.equal(lib.findRoot(deep), null, 'a tight bound must stop the walk short');
  } finally {
    if (prev === undefined) delete process.env.MOMENTUM_MAX_PARENT_WALK;
    else process.env.MOMENTUM_MAX_PARENT_WALK = prev;
    rmrf(tmp);
  }
});

test('events.resolveEcosystemRootFrom delegates rather than reimplementing', () => {
  const { tmp, root, dirs } = siblingLayout();
  try {
    const events = require('../core/ecosystem/lib/events');
    assert.equal(events.resolveEcosystemRootFrom(dirs.backend), lib.findRoot(dirs.backend));
    assert.equal(events.resolveEcosystemRootFrom(dirs.backend), path.resolve(root));

    // And it must be a delegation, not a copy.
    const src = fs.readFileSync(
      path.join(REPO_ROOT, 'core', 'ecosystem', 'lib', 'events.js'), 'utf8');
    const body = src.slice(src.indexOf('function resolveEcosystemRootFrom'));
    const fn = body.slice(0, body.indexOf('\n}') + 2);
    assert.match(fn, /lib\.findRoot/);
    assert.doesNotMatch(fn, /readdirSync/,
      'events.js must not carry its own sibling scan any more');
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — exactly one implementation, enforced
// ─────────────────────────────────────────────────────────────────────────────

test('AC-2: only ONE ecosystem-root discovery implementation exists in JS', () => {
  // A file is suspected of re-implementing discovery when it both references the
  // manifest AND walks siblings. That heuristic is file-wide and therefore
  // imprecise, so every exception is listed WITH ITS REASON rather than silently
  // filtered — and the test fails if a file appears that is not on the list.
  // The point is not perfect detection; it is that adding an eighth
  // implementation cannot happen quietly.
  const ALLOWED = new Map([
    // Owns the registration index that findRoot delegates to. Answers a
    // different question: "where is this repo registered?"
    [path.join('core', 'ecosystem', 'lib', 'state.js'), 'owns the registration index'],
    // Scans siblings for OTHER MOMENTUM PROJECTS to offer ecosystem creation.
    // Not root discovery — a false positive of the file-wide heuristic.
    [path.join('bin', 'momentum.js'), 'sibling scan is the auto-ecosystem prompt'],
    // TODO(31c G2): carries its own sibling scan because it could not require
    // core. Removed when it starts requiring the vendored runtime. This entry
    // must be GONE by the end of the phase.
    [path.join('core', 'git-hooks', 'eco-event.js'), 'pending G2 rewire'],
  ]);

  const offenders = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.name.endsWith('.js')) continue;

      const rel = path.relative(REPO_ROOT, full);
      if (rel === path.join('core', 'ecosystem', 'lib', 'index.js')) continue; // the one impl
      if (rel.includes(`.momentum${path.sep}runtime`)) continue;               // vendored copies

      const src = fs.readFileSync(full, 'utf8');
      const mentionsManifest = /ecosystem\.json|MANIFEST_FILENAME/.test(src);
      const walksSiblings = /readdirSync\([^)]*parent|readdirSync\(path\.dirname/.test(src);
      if (mentionsManifest && walksSiblings) offenders.push(rel);
    }
  };
  for (const r of ['core', 'bin']) walk(path.join(REPO_ROOT, r));

  const unexplained = offenders.filter((f) => !ALLOWED.has(f));
  assert.deepEqual(unexplained, [],
    'these files appear to re-implement ecosystem-root discovery — call '
    + `lib.findRoot, or add an explicit reason to ALLOWED:\n  ${unexplained.join('\n  ')}`);

  // The allowlist must not rot: every entry must still be a real match.
  for (const f of ALLOWED.keys()) {
    assert.ok(offenders.includes(f),
      `${f} is allowlisted but no longer matches — remove it from ALLOWED`);
  }
});

test('AC-2: the CLIs no longer carry local discovery fallbacks', () => {
  for (const f of ['bin/ecosystem.js', 'bin/swarm.js']) {
    const src = fs.readFileSync(path.join(REPO_ROOT, f), 'utf8');
    const fn = src.slice(src.indexOf('function resolveEcosystemRoot'));
    const body = fn.slice(0, fn.indexOf('\n}\n') + 3);
    assert.match(body, /findRoot/, `${f} must use the unified resolver`);
    assert.doesNotMatch(body, /findRegistration/,
      `${f} must not carry its own registration fallback — findRoot does it`);
  }
});
