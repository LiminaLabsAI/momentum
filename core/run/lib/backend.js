'use strict';

/**
 * Phase 32c G0 — governor backend selection.
 *
 * `core/run/CONTRACT.md` states one invariant — **the next unit starts** — and
 * two ways to satisfy it, because the four supported adapters split cleanly:
 *
 *   interceptor  Claude Code, Antigravity — a `Stop` event a hook can BLOCK.
 *                Block it and inject the next unit in place. Same session.
 *   reinvoker    Codex, opencode — `notify`/`agent-turn-complete` and
 *                `session.idle` are fire-and-forget: they can only OBSERVE a
 *                turn ending. Relaunch a fresh invocation against the manifest.
 *
 * Neither is a degraded form of the other. The re-invoker is the external-driver
 * architecture — the loop lives in a process, not in an agent's good intentions
 * — and is therefore structurally incapable of becoming dead code the way
 * `pollTurn` did (BUG-031).
 *
 * A `null` backend is an EXPLICIT, DOCUMENTED degradation, never a silent
 * no-op. An adapter momentum cannot drive autonomously must say so out loud, in
 * the same place every other capability is declared — momentum has shipped
 * silent non-functionality before (BUG-009, BUG-030, BUG-031) and the pattern
 * is always the same: something claimed a capability nothing backed.
 */

const path = require('path');
const fs = require('fs');

const KIND = Object.freeze({
  INTERCEPTOR: 'interceptor',
  REINVOKER: 'reinvoker',
});

const ADAPTERS_DIR = path.resolve(__dirname, '..', '..', '..', 'adapters');

/**
 * Read `governorBackend` off an adapter without executing it.
 *
 * Textual rather than `require()` because adapter modules pull in install-time
 * helpers, and reading a capability must never have side effects.
 */
function declaredBackend(adapterName, adaptersDir) {
  const file = path.join(adaptersDir || ADAPTERS_DIR, adapterName, 'adapter.js');
  let src;
  try { src = fs.readFileSync(file, 'utf8'); } catch (_e) { return undefined; }

  const m = src.match(/governorBackend:\s*(null|'([a-z]+)'|"([a-z]+)")/);
  if (!m) return undefined;          // capability not declared at all
  if (m[1] === 'null') return null;  // declared, and declared absent
  return m[2] || m[3];
}

/**
 * @returns {{kind: string|null, autonomous: boolean, reason: string}}
 */
function resolve(adapterName, opts = {}) {
  const declared = declaredBackend(adapterName, opts.adaptersDir);

  if (declared === undefined) {
    return {
      kind: null,
      autonomous: false,
      reason: `${adapterName} does not declare governorBackend — autonomous runs are unavailable`,
    };
  }
  if (declared === null) {
    return {
      kind: null,
      autonomous: false,
      reason: `${adapterName} declares no governor backend — autonomous runs are unavailable on this agent`,
    };
  }
  if (declared !== KIND.INTERCEPTOR && declared !== KIND.REINVOKER) {
    // Fail loud. An unknown backend name is a typo or a half-finished addition,
    // and treating it as "some backend" would be exactly the silent
    // non-functionality this module exists to prevent.
    return {
      kind: null,
      autonomous: false,
      reason: `${adapterName} declares unknown governorBackend "${declared}"`,
    };
  }
  return {
    kind: declared,
    autonomous: true,
    reason: `${adapterName} drives autonomous runs via the ${declared} backend`,
  };
}

/** Every adapter with a directory on disk, for parity assertions. */
function allAdapters(adaptersDir) {
  const dir = adaptersDir || ADAPTERS_DIR;
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'adapter.js')))
      .map((e) => e.name)
      .sort();
  } catch (_e) { return []; }
}

/** Does this adapter receive the interceptor hook script? Used to gate install. */
function wantsInterceptorScript(adapterName, opts = {}) {
  return resolve(adapterName, opts).kind === KIND.INTERCEPTOR;
}

// `declaredBackend` and `allAdapters` are internals of `resolve`. The
// production surface is `resolve` (what backend does this adapter use?) and
// `wantsInterceptorScript` (does it get the hook script?). The conformance
// suite reaches the internals through those.
module.exports = { resolve, wantsInterceptorScript, KIND };
