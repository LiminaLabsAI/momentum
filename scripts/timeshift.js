'use strict';

/**
 * Test-only clock shifter — finds time-bomb tests before the calendar does.
 *
 * A test that pins an event to a frozen timestamp and then asserts on a code
 * path reading the REAL clock passes until the gap exceeds some window, then
 * fails forever with no code change and nothing to bisect. BUG-038 was exactly
 * that: `cross-repo-nudge.test.js` froze an event at 2026-07-27T12:00Z and
 * spawned the gate as a subprocess, so it aged out of `detect()`'s 24h window at
 * 2026-07-28T12:00Z — eighteen minutes after v0.44.1 was tagged on a green suite.
 *
 * Preloaded with `node --require`, so it patches nothing in production code:
 *
 *     MOMENTUM_TIMESHIFT_DAYS=30 node --require ./scripts/timeshift.js --test tests/*.test.js
 *
 * Failures under a shift are not necessarily bugs in the code — they are tests
 * whose correctness depends on today's date, which is the thing worth knowing.
 *
 * ## What it CANNOT see (measured 2026-07-28, read this before trusting a run)
 *
 * It patches `Date` in THIS process only. Two clock sources stay real:
 *
 *   1. **Subprocesses.** A spawned `bash` or `node` child reads the true clock.
 *   2. **Filesystem mtimes.** `fs.statSync().mtimeMs` is not shiftable.
 *
 * Any code comparing a shifted `Date.now()` against either one sees a skew this
 * tool invented. A +30 day run over the full suite produced **six** failures and
 * **all six were that artifact** — five at a subprocess boundary (pre-push grant
 * expiry, session-append ×2, the git-commit E2E, the lanes queue footer) and one
 * against a stamp-file mtime (the opencode history-reminder throttle). Zero were
 * real bombs.
 *
 * So it is a candidate-generator for in-process, pure-`Date` logic, not a gate.
 * It is deliberately NOT wired into `npm test`: a check with six standing false
 * positives is one people learn to skip, and Phase 33 already paid for that
 * lesson. Reach for it when a date-dependent failure is suspected, and expect to
 * triage each hit by hand.
 */

const days = Number(process.env.MOMENTUM_TIMESHIFT_DAYS || 0);
if (Number.isFinite(days) && days !== 0) {
  const offsetMs = days * 24 * 60 * 60 * 1000;
  const RealDate = Date;
  const shiftedNow = () => RealDate.now() + offsetMs;

  class ShiftedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(shiftedNow());
      else super(...args);
    }
    static now() { return shiftedNow(); }
  }
  ShiftedDate.parse = RealDate.parse;
  ShiftedDate.UTC = RealDate.UTC;

  global.Date = ShiftedDate;
}
