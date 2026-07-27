'use strict';

/**
 * Phase 31c G4 — the production-call-path guard (ADR-0018 R6).
 *
 * BUG-030 shipped because EVERY test injected `ecosystemRoot`, while production
 * (`momentum lanes land` → `landingCheck(repoRoot)`) must DISCOVER it. The
 * injected form worked, the discovered form returned `applicable: false`, and
 * the entire cross-repo landing gate was skipped in silence.
 *
 * That is the third instance of one shape in this arc — BUG-028's test bypassed
 * the hook matcher, BUG-029's had no authority to check against, BUG-030's took
 * the injection shortcut. Phase 31b already tried closing the class with a
 * hand-written assertion and the class reproduced twice within hours, so this
 * guard is ENUMERATIVE: it discovers the entry points itself and fails when a
 * NEW one appears uncovered. Nobody has to remember to add a case.
 *
 * The rule it enforces: if a function accepts an optional injectable root, it
 * must be exercised WITHOUT one, in a real sibling layout.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, write } = require('./_helpers');

const REPO_ROOT = path.resolve(__dirname, '..');

/** `opts.ecosystemRoot || …` but NOT `!opts.ecosystemRoot || …` (see above). */
const FALLBACK_IDIOM = /(?<![!\w.])opts\.ecosystemRoot\s*\|\|/;

/**
 * Entry points that accept an optional root. Discovered by scanning core for
 * the FALLBACK idiom `opts.ecosystemRoot || <discover>` — the exact shape that
 * makes injection optional, and therefore the exact shape that makes the
 * shortcut available to a test.
 *
 * Deliberately NOT matched: `!opts.ecosystemRoot || return` (a guard clause).
 * That is the opposite contract — the function REQUIRES injection and no-ops
 * without it, so there is no discovery path to get wrong. The negative
 * lookbehind draws that line; it narrows the scan by contract, not by
 * convenience, which is the difference between a precise guard and one tuned
 * until it looks clean.
 */
function findInjectableEntryPoints() {
  const hits = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || full.includes(`.momentum${path.sep}runtime`)) continue;
        walk(full);
        continue;
      }
      if (!e.name.endsWith('.js')) continue;
      const src = fs.readFileSync(full, 'utf8');
      if (!FALLBACK_IDIOM.test(src)) continue;

      // Name the enclosing exported functions so failures are actionable.
      for (const m of src.matchAll(/function\s+([A-Za-z0-9_]+)\s*\(/g)) {
        const after = src.slice(m.index, src.indexOf('\n}\n', m.index) + 3);
        if (FALLBACK_IDIOM.test(after)) {
          hits.push({ file: path.relative(REPO_ROOT, full), fn: m[1] });
        }
      }
    }
  };
  walk(path.join(REPO_ROOT, 'core'));
  return hits;
}

/** A real sibling layout: ecosystem root beside its members, nothing injected. */
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
  runCli(['ecosystem', 'initiative', 'create', 'attachments',
    '--why', 'w', '--repos', 'backend,frontend', '--owner', 'ada'], { cwd: root });
  runCli(['ecosystem', 'initiative', 'start', 'attachments',
    '--contribute', 'backend:phase:p12',
    '--contribute', 'frontend:adhoc:a1',
    '--edge', 'frontend:backend:api-contract'], { cwd: root });
  return { tmp, root, dirs };
}

/**
 * Every injectable entry point, with an assertion that exercises it WITHOUT a
 * root and proves it discovered one. Adding an entry point without adding a
 * case here fails the enumeration test below.
 */
const COVERED = {
  'landingCheck': ({ dirs }) => {
    const landing = require('../core/ecosystem/lib/landing');
    const res = landing.landingCheck(dirs.frontend); // ← no ecosystemRoot
    assert.equal(res.applicable, true,
      'landingCheck must discover the ecosystem — this is BUG-030 exactly');
    assert.equal(res.member, 'frontend');
  },
  'recordEvent': ({ dirs }) => {
    const events = require('../core/ecosystem/lib/events');
    // Not a git repo, so this returns a reason rather than recording — the
    // point is that it got PAST discovery to the member check.
    const res = events.recordEvent({
      cwd: dirs.backend, kind: 'commit', summary: 's', context: 'c',
    }); // ← no ecosystemRoot
    assert.notEqual(res.reason, 'no ecosystem',
      'recordEvent must discover the ecosystem without injection');
  },
};

test('R6: every injectable entry point is exercised WITHOUT an injected root', () => {
  const found = findInjectableEntryPoints();
  assert.ok(found.length > 0, 'the scanner should find at least the known entry points');

  const uncovered = found.filter((h) => !COVERED[h.fn]);
  assert.deepEqual(uncovered.map((h) => `${h.file}:${h.fn}`), [],
    'these accept an optional root but have no no-injection test. BUG-030 shipped '
    + 'because every test took the injection shortcut — add a case to COVERED:\n  '
    + uncovered.map((h) => `${h.file}:${h.fn}`).join('\n  '));
});

test('R6: the covered entry points actually work without injection', () => {
  const { tmp, root, dirs } = siblingLayout();
  try {
    for (const [name, check] of Object.entries(COVERED)) {
      try {
        check({ tmp, root, dirs });
      } catch (err) {
        throw new Error(`${name} fails on its PRODUCTION call path: ${err.message}`);
      }
    }
  } finally { rmrf(tmp); }
});

test('R6: COVERED does not rot — every entry is still a real entry point', () => {
  const found = new Set(findInjectableEntryPoints().map((h) => h.fn));
  for (const name of Object.keys(COVERED)) {
    assert.ok(found.has(name),
      `${name} is in COVERED but no longer accepts an injectable root — remove it`);
  }
});
