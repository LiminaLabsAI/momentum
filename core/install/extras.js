'use strict';

/**
 * Phase 33 G1 — the installed surface that `adapter.destinations` does not describe.
 *
 * Most of an install is mechanical: `core/commands/` → the adapter's `commands`
 * destination, `core/scripts/` → its `scripts` destination. But three files have
 * never fit that shape, and each was open-coded twice in `bin/momentum.js` (once
 * in the init path, once in upgrade):
 *
 *   - `session-append.sh` and `orient.js` live under `core/ecosystem/` because
 *     they belong to that subsystem, yet they install into `scripts/` because
 *     that is where `check-history-reminder.sh` and `sessionstart-handoff.sh`
 *     resolve them.
 *   - `run-governor.sh` copies with the rest of `core/scripts/` but must be
 *     REMOVED again for adapters that cannot invoke an interceptor (32c).
 *
 * This module exists because a third reader appeared. `core/selfcheck/lib/parity.js`
 * derives the shipped surface from `destinations`, so it silently under-reported
 * by exactly these three files — a parity checker blind to the files most likely
 * to drift, since special cases are what people forget to update. Had
 * `session-append.sh` gone stale, selfcheck would have said "no drift".
 *
 * So: one declaration, three readers. The alternative — a second hand-written
 * list inside parity.js — is the duplication ADR-0018 exists to end, and it had
 * already produced a wrong answer before anyone wrote it down.
 */

/**
 * Files copied from outside the adapter's `destinations` map.
 * `src` is relative to the momentum package root; `destKey` names the adapter
 * destination its `name` lands in.
 */
const EXTRA_COPIES = Object.freeze([
  Object.freeze({
    src: ['core', 'ecosystem', 'scripts', 'session-append.sh'],
    destKey: 'scripts',
    name: 'session-append.sh',
    executable: true,
    why: 'Phase 9 — sourced by check-history-reminder.sh from $script_dir/',
  }),
  Object.freeze({
    src: ['core', 'ecosystem', 'lib', 'orient.js'],
    destKey: 'scripts',
    name: 'orient.js',
    executable: false,
    why: 'TRANSITIONAL (31c G1→G3) — sessionstart-handoff.sh still resolves scripts/orient.js',
  }),
]);

/**
 * Files that `core/scripts/` copies wholesale but that must not survive on
 * adapters lacking the capability. Gating the init path alone is insufficient:
 * upgrade re-copies the whole directory, so the next upgrade would restore a
 * script the adapter cannot invoke. The idempotence test caught exactly that.
 */
const CONDITIONAL_REMOVALS = Object.freeze([
  Object.freeze({
    destKey: 'scripts',
    name: 'run-governor.sh',
    keepWhen: (adapterName) => require('../run/lib/backend').wantsInterceptorScript(adapterName),
    why: 'Phase 32c — only interceptor backends can invoke a Stop hook script',
  }),
]);

/** The extra copies that actually apply, as `{srcRel, destParts, executable}`. */
function extraCopiesFor(destinations) {
  const out = [];
  for (const e of EXTRA_COPIES) {
    const dest = destinations[e.destKey];
    if (!dest) continue;
    out.push({ srcRel: e.src, destParts: [...dest, e.name], executable: e.executable });
  }
  return out;
}

/** Names to delete after a wholesale copy, given the adapter. */
function removalsFor(destinations, adapterName) {
  const out = [];
  for (const r of CONDITIONAL_REMOVALS) {
    const dest = destinations[r.destKey];
    if (!dest || r.keepWhen(adapterName)) continue;
    out.push({ destParts: [...dest, r.name] });
  }
  return out;
}

module.exports = { EXTRA_COPIES, CONDITIONAL_REMOVALS, extraCopiesFor, removalsFor };
