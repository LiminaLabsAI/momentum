'use strict';

/**
 * Phase 32c G1 — the RE-INVOKER backend (`core/run/CONTRACT.md`).
 *
 * Codex and opencode cannot block a turn ending. Codex's `notify` fires on
 * `agent-turn-complete` and opencode's `session.idle` fires when a session goes
 * idle — both fire-and-forget, both purely observational. (opencode issue
 * #16879 is an open upstream request for the awaited behaviour a blocking hook
 * would need.)
 *
 * So this backend satisfies the invariant the other way round: instead of
 * BLOCKING the stop and injecting, it OBSERVES the stop and launches a fresh
 * agent invocation pointed at the run manifest. The invariant is the same —
 * **the next unit starts** — which is exactly why 32a reframed it away from
 * "block the stop", a phrasing only two of four adapters could ever satisfy.
 *
 * This is not a degraded interceptor. It is the external-driver architecture:
 * the loop lives in a process rather than in an agent's good intentions, which
 * makes it structurally incapable of becoming dead code the way `pollTurn` did
 * (BUG-031). The cost is a cold start per unit — and momentum's own doctrine
 * says state lives in files precisely so that is survivable.
 *
 * HEADLESS COMMANDS ARE DECLARED, NOT GUESSED. An adapter with no headless
 * entry point degrades to printing the resume command rather than pretending to
 * continue. Guessing an invocation would produce a backend that appears to work
 * and silently does nothing — the failure this epic keeps rediscovering.
 */

const { spawn } = require('child_process');

const governor = require('./governor');
const manifestLib = require('./manifest');

/**
 * Per-adapter headless invocation. Each entry is a fact about a vendor CLI, not
 * a guess: an adapter absent from this table has no headless path and is
 * handled by the degradation branch below.
 */
const HEADLESS = Object.freeze({
  // `codex exec` runs a prompt non-interactively.
  codex: Object.freeze({ bin: 'codex', args: ['exec'] }),
  // `opencode run` executes a prompt without a TUI session.
  opencode: Object.freeze({ bin: 'opencode', args: ['run'] }),
});

/** The prompt handed to the relaunched agent. The manifest carries the rest. */
function continuationPrompt(unit) {
  return [
    'momentum run: continue the active run.',
    '',
    `Next unit: ${unit}`,
    '',
    'Read .momentum/run.json for full state (policy, decisions taken, parked',
    'questions, cursor). Proceed without asking — commits, pushes, test runs and',
    'tracking updates are all pre-authorized. Stop only for a destructive',
    'operation not in the plan, a discovery that invalidates the agreed plan, or',
    'an action needing credentials or spend.',
    '',
    'Halt at any time: touch .momentum/run-stop',
  ].join('\n');
}

/** Is a headless path declared for this adapter? */
function supports(adapterName) {
  return Object.prototype.hasOwnProperty.call(HEADLESS, adapterName || process.env.MOMENTUM_ADAPTER || '');
}

/**
 * Honour the governor's decision.
 *
 * @param {object} decision from `governor.decide` — this backend never re-decides
 * @param {{repoRoot: string, adapter?: string, dryRun?: boolean}} ctx
 * @returns {{started: boolean, obstructed: boolean, unit: string|null, degraded?: string}}
 */
function onTurnEnd(decision, ctx = {}) {
  const root = ctx.repoRoot || process.env.MOMENTUM_RUN_ROOT || process.cwd();
  try {
    if (!decision || decision.action !== governor.ACTION.CONTINUE) {
      // Never obstruct a stop the governor allowed.
      return { started: false, obstructed: false, unit: null };
    }

    const unit = (decision.next && decision.next.unit) || null;

    // Idempotence is the CURSOR's job, not this backend's memory — a doubled
    // `notify` or `session.idle` must start the unit once. `advance` no-ops when
    // the cursor is already there.
    manifestLib.advance(root, unit, new Date().toISOString());

    if (ctx.dryRun) return { started: true, obstructed: false, unit };

    const adapter = ctx.adapter || process.env.MOMENTUM_ADAPTER || '';
    const headless = HEADLESS[adapter];
    if (!headless) {
      // DECLARED degradation. Say what happened and how to resume; do not
      // pretend the run is continuing.
      const msg = `momentum: no headless invocation declared for "${adapter || 'unknown adapter'}" — `
        + `run \`momentum run continue\` to resume at ${unit}.`;
      process.stderr.write(`${msg}\n`);
      return { started: false, obstructed: false, unit, degraded: msg };
    }

    manifestLib.recordTurn(root, new Date().toISOString());

    // Detached: the observing process is about to exit, and the relaunched
    // agent must outlive it.
    const child = spawn(headless.bin, headless.args.concat([continuationPrompt(unit)]), {
      cwd: root,
      detached: true,
      stdio: 'ignore',
      env: Object.assign({}, process.env, { MOMENTUM_RUN_ROOT: root }),
    });
    child.unref();

    return { started: true, obstructed: false, unit };
  } catch (_e) {
    // Fail open, unconditionally.
    return { started: false, obstructed: false, unit: null };
  }
}

/**
 * DRIVE THE RUN TO COMPLETION — the external driver loop.
 *
 * This exists because "observe the stop, spawn one replacement" is not enough,
 * and believing otherwise would have shipped a backend that advances exactly one
 * unit and then stops in silence.
 *
 * The proof case is opencode. Its plugin event handler is registered
 * CONDITIONALLY: `opencode run` (non-interactive) skips it, because the mere
 * presence of an event handler hangs run-mode on 1.17.x — a live-verified
 * constraint documented in the adapter. So the chain would be:
 *
 *   interactive session goes idle → handler fires → spawn `opencode run`
 *   → that session has NO handler → nothing observes ITS turn ending
 *   → the run stops after one unit, with no error anywhere.
 *
 * Codex has the same shape for a different reason: `notify` is configured in
 * the user's `~/.codex/config.toml`, which momentum does not own and cannot
 * install into, so the re-trigger cannot be assumed to exist at all.
 *
 * The fix is to take the phrase "the loop lives in a process" literally. The
 * observing hook starts this driver ONCE; the driver then spawns, WAITS, asks
 * the governor again, and repeats. Nothing downstream needs to re-trigger
 * anything — which is also what makes this backend structurally incapable of
 * the `pollTurn` failure (BUG-031): the loop is not somebody's good intentions,
 * it is a while-loop with a process in it.
 *
 * @param {{repoRoot: string, adapter: string, maxUnits?: number, spawnSync?: Function}} ctx
 * @returns {{units: number, stoppedBecause: string, degraded?: string}}
 */
function drive(ctx = {}) {
  const root = ctx.repoRoot || process.env.MOMENTUM_RUN_ROOT || process.cwd();
  const adapter = ctx.adapter || process.env.MOMENTUM_ADAPTER || '';
  const headless = HEADLESS[adapter];
  // Belt-and-braces bound. The governor's own budget is the real limit; this
  // guards against a manifest that never reaches a terminal decision.
  const maxUnits = typeof ctx.maxUnits === 'number' ? ctx.maxUnits : 500;

  if (!headless) {
    const msg = `momentum: no headless invocation declared for "${adapter || 'unknown adapter'}" — `
      + 'run `momentum run continue` to resume.';
    return { units: 0, stoppedBecause: 'no-headless-path', degraded: msg };
  }

  const runOnce = ctx.spawnSync || require('child_process').spawnSync;
  let units = 0;

  for (;;) {
    const manifest = manifestLib.loadSafe(root);
    const decision = governor.decide({
      manifest,
      killSwitch: manifestLib.killSwitchEngaged(root),
      now: new Date().toISOString(),
    });

    if (decision.action !== governor.ACTION.CONTINUE) {
      return { units, stoppedBecause: governor.explain(decision) };
    }
    if (units >= maxUnits) {
      return { units, stoppedBecause: `driver unit cap (${maxUnits}) reached` };
    }

    const unit = (decision.next && decision.next.unit) || null;
    manifestLib.recordTurn(root, new Date().toISOString());

    // SYNCHRONOUS: the whole point. The next iteration must see the state the
    // agent left behind, so the driver waits rather than firing and forgetting.
    runOnce(headless.bin, headless.args.concat([continuationPrompt(unit)]), {
      cwd: root,
      stdio: 'inherit',
      env: Object.assign({}, process.env, { MOMENTUM_RUN_ROOT: root, MOMENTUM_ADAPTER: adapter }),
    });
    units += 1;

    // If the agent did not move the cursor, it did not finish its unit — and
    // spawning again would re-run the same work forever. Treat it as a strike
    // so the governor's existing rail ends the loop.
    const after = manifestLib.loadSafe(root);
    if (after && after.cursor && after.cursor.unit === unit) {
      manifestLib.recordStrike(root, unit, new Date().toISOString());
    }
  }
}

/**
 * Entry point for the observing hook (`notify` / `session.idle`). Mirrors
 * `hook.js`'s `main`, but exits 0 always — there is no stop to block.
 */
function main() {
  const root = process.env.MOMENTUM_RUN_ROOT || process.cwd();
  const manifest = manifestLib.loadSafe(root);
  if (!manifest) return 0;

  const decision = governor.decide({
    manifest,
    killSwitch: manifestLib.killSwitchEngaged(root),
    now: new Date().toISOString(),
  });

  if (decision.action !== governor.ACTION.CONTINUE) {
    try {
      if (decision.reason !== governor.STOP_REASON.NOT_RUNNING) {
        manifestLib.setStatus(root, 'stopped', new Date().toISOString(), governor.explain(decision));
      }
    } catch (_e) { /* fail open */ }
    return 0;
  }

  onTurnEnd(decision, { repoRoot: root });
  return 0;
}

if (require.main === module) {
  let code = 0;
  try { code = main(); } catch (_e) { code = 0; }
  process.exit(code);
}

module.exports = { supports, onTurnEnd, drive, main, continuationPrompt, HEADLESS };
