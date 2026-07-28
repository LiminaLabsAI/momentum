'use strict';

/**
 * Phase 33 G1 — momentum's own install must match what momentum ships.
 *
 * Every guard in this repo checks the working tree. The working tree is not
 * where software fails. `scripts/verify-published.sh` closed one half of that
 * gap (what users download); this closes the other half (what momentum itself
 * runs), and the other half turned out to be worse:
 *
 *   - `.claude/settings.json` had no `Stop` hook — momentum shipped a governor
 *     it could not itself run, for the entire life of the feature.
 *   - `scripts/run-governor.sh` was absent from the install.
 *   - `scripts/cross-repo-gate.sh` was the pre-v0.43.1 version — momentum was
 *     running the buggy build of a fix it had shipped that same day.
 *
 * Sixth variant of "green here, dead where it ships" (BUG-002, BUG-030,
 * BUG-031, BUG-033, BUG-034) and the first found in momentum's own install.
 *
 * `extra` is reported but never failed on: momentum's `scripts/` legitimately
 * carries development tooling no target project should receive. A guard that
 * flags those is a guard people learn to silence, and a silenced guard is how
 * the three defects above survived.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const REPO_ROOT = path.resolve(__dirname, '..');
const parity = require(path.join(REPO_ROOT, 'core', 'selfcheck', 'lib', 'parity.js'));

/** momentum installs itself as claude-code; that is the surface under test. */
const SELF_ADAPTER = 'claude-code';

test('momentum\'s own install has not drifted from what it ships', () => {
  const r = parity.check(REPO_ROOT, SELF_ADAPTER);

  assert.ok(r.checked > 40, `expected a real surface, got ${r.checked} files`);

  const detail = [
    r.missing.length ? `MISSING (shipped, absent here):\n  - ${r.missing.join('\n  - ')}` : '',
    r.changed.length ? `CHANGED (present but stale vs source):\n  ~ ${r.changed.join('\n  ~ ')}` : '',
    '',
    'Repair:  node bin/momentum.js selfcheck --fix',
  ].filter(Boolean).join('\n');

  assert.equal(parity.hasDrift(r), false, `momentum's own install has drifted.\n\n${detail}\n`);
});

/**
 * The guard proven red — against every shape it must catch.
 *
 * 32c taught this the expensive way: the orphan guard's synthetic probe used
 * one export shape, so the guard was blind to the other shape for two phases
 * while reporting green. A probe that only exercises one failure mode proves
 * only that one failure mode. So: both `missing` and `changed` get their own
 * synthetic drift, in a COPY of the repo — never in the live tree, because a
 * crashed test must not leave momentum's own install damaged.
 */
test('the detector fires on synthetic drift — both shapes', () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'momentum-parity-'));
  try {
    const expected = parity.expectedSurface(SELF_ADAPTER);
    // Materialise a known-clean install from the surface map itself.
    for (const [rel, src] of expected) {
      const dest = path.join(sandbox, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }

    const clean = parity.check(sandbox, SELF_ADAPTER);
    assert.equal(parity.hasDrift(clean), false,
      `a surface materialised from expectedSurface() must be clean, got: ` +
      `${clean.missing.length} missing, ${clean.changed.length} changed`);

    // Shape 1: a shipped file deleted.
    const victim = [...expected.keys()].find((k) => k.endsWith('.md'));
    fs.rmSync(path.join(sandbox, victim));
    let r = parity.check(sandbox, SELF_ADAPTER);
    assert.ok(r.missing.includes(victim), `deleting ${victim} must surface as missing`);
    assert.equal(parity.hasDrift(r), true);

    // …and restored.
    fs.copyFileSync(expected.get(victim), path.join(sandbox, victim));
    assert.equal(parity.hasDrift(parity.check(sandbox, SELF_ADAPTER)), false,
      'restoring the file must return the check to green');

    // Shape 2: a shipped file present but stale — the shape that hid the
    // pre-v0.43.1 cross-repo gate. Byte-different, same path, same size class.
    const stale = [...expected.keys()].find((k) => k.endsWith('.sh'));
    fs.appendFileSync(path.join(sandbox, stale), '\n# drift\n');
    r = parity.check(sandbox, SELF_ADAPTER);
    assert.ok(r.changed.includes(stale), `a stale ${stale} must surface as changed`);
    assert.equal(parity.hasDrift(r), true);

    fs.copyFileSync(expected.get(stale), path.join(sandbox, stale));
    assert.equal(parity.hasDrift(parity.check(sandbox, SELF_ADAPTER)), false,
      'restoring the stale file must return the check to green');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

/**
 * The CLI is the operator's entry point, so the CLI is what gets tested — not
 * just the library behind it. BUG-033 shipped a library that was correct and
 * unreachable; testing only `parity.check()` would repeat exactly that mistake.
 */
test('momentum selfcheck is reachable from the real CLI and reports honestly', () => {
  const out = execFileSync('node', [path.join(REPO_ROOT, 'bin', 'momentum.js'), 'selfcheck', '--json'],
    { cwd: REPO_ROOT, encoding: 'utf8' });
  const r = JSON.parse(out);
  for (const k of ['missing', 'changed', 'extra', 'checked']) {
    assert.ok(k in r, `selfcheck --json must report ${k}`);
  }
  assert.equal(parity.hasDrift(r), false, 'CLI must agree with the library: no drift');
});

/**
 * The hole this engine shipped with, and the guard against re-opening it.
 *
 * G1's first version derived the surface from `adapter.destinations` alone. That
 * made it blind to `scripts/session-append.sh` and `scripts/orient.js`, which the
 * installer copies out of `core/ecosystem/` as special cases — i.e. blind to the
 * two files MOST likely to drift, since special cases are precisely what people
 * forget to update. Had `session-append.sh` gone stale, selfcheck would have
 * answered "no drift": a parity checker with a hole exactly where parity breaks.
 *
 * The fix was one declaration (`core/install/extras.js`) read by the installer
 * and the checker both. This test is what keeps them the same declaration.
 */
test('the surface covers every installer special case', () => {
  const extras = require(path.join(REPO_ROOT, 'core', 'install', 'extras.js'));
  const adapter = require(path.join(REPO_ROOT, 'adapters', SELF_ADAPTER, 'adapter.js'));
  const surface = parity.expectedSurface(SELF_ADAPTER);

  assert.ok(extras.EXTRA_COPIES.length > 0, 'the declaration must not be empty');
  for (const e of extras.extraCopiesFor(adapter.destinations)) {
    const rel = path.join(...e.destParts);
    assert.ok(surface.has(rel), `installer copies ${rel}, so the parity surface must include it`);
  }
});

/**
 * The inverse: a file the installer DELETES must not be demanded as present.
 * `run-governor.sh` copies with the rest of `core/scripts/` but is removed again
 * for adapters that cannot invoke a Stop hook (32c). A surface that ignored the
 * removal would report permanent phantom drift on those adapters — and a check
 * that is always red is a check that gets turned off.
 */
test('the surface honours conditional removals per adapter', () => {
  const interceptor = parity.expectedSurface('claude-code');
  assert.ok(interceptor.has(path.join('scripts', 'run-governor.sh')),
    'an interceptor adapter ships the governor script');

  const reinvoker = parity.expectedSurface('opencode');
  assert.ok(!reinvoker.has(path.join('scripts', 'run-governor.sh')),
    're-invoker adapters have it removed, so parity must not demand it');
});

test('selfcheck --fix is opt-in — a bare run never writes', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'selfcheck.js'), 'utf8');
  const bare = src.slice(0, src.indexOf("args.includes('--fix')"));
  assert.ok(!/\b(copyFileSync|writeFileSync|rmSync)\b/.test(bare),
    'the default path must not write — reporting is the default, repair is opt-in');
});
