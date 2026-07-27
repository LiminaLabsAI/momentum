'use strict';

/**
 * Swarm inbox protocol — now a THIN ADAPTER over `core/run/lib/inbox.js`.
 *
 * Phase 32a G2 moved the implementation up to `core/run/` because parking is
 * the decision-authority classifier's default branch (ADR-0019 §4) and must be
 * available to a run at any tier, not only to a cross-repo swarm. This file
 * keeps swarm's public surface and on-disk format **byte-identical** — the same
 * one-engine/thin-adapter shape ADR-0003 used for the wave engine.
 *
 * What stays swarm-specific, and is therefore still here:
 *   - the `(ecosystemRoot, swarmId)` → directory mapping
 *   - swarm's mkdir lock (so lock files land beside the manifest as before)
 *   - the `Repo:` field label, so existing inbox items and their tests are unchanged
 *   - the audit-log append on resolve
 *
 * Supervisors write `<eco>/swarms/<id>/inbox/NNNN-<slug>.md` when they need a
 * decision they cannot make alone. The conductor surfaces these per turn and
 * resolves them; resolved items move to `inbox/resolved/` and are preserved.
 */

const core = require('../run/lib/inbox');
const manifestLib = require('./lib/manifest');

/** Swarm items have always carried `- Repo:`; keep it so nothing on disk shifts. */
const FIELD_LABEL = 'Repo';

const INBOX_DIR = core.INBOX_DIR;
const RESOLVED_DIR = core.RESOLVED_DIR;
const INDEX_FILENAME = core.INDEX_FILENAME;

function baseDir(ecosystemRoot, swarmId) {
  return manifestLib.swarmDir(ecosystemRoot, swarmId);
}

function inboxDir(ecosystemRoot, swarmId) {
  return core.inboxDir(baseDir(ecosystemRoot, swarmId));
}

function resolvedDir(ecosystemRoot, swarmId) {
  return core.resolvedDir(baseDir(ecosystemRoot, swarmId));
}

function indexPath(ecosystemRoot, swarmId) {
  return core.indexPath(baseDir(ecosystemRoot, swarmId));
}

function ensureLayout(ecosystemRoot, swarmId) {
  // The swarm layout is a superset of the inbox layout — manifest dirs first.
  manifestLib.ensureSwarmLayout(ecosystemRoot, swarmId);
  core.ensureLayout(baseDir(ecosystemRoot, swarmId));
}

function nextInboxId(ecosystemRoot, swarmId) {
  ensureLayout(ecosystemRoot, swarmId);
  return core.nextInboxId(baseDir(ecosystemRoot, swarmId));
}

/** Supervisor-side write. Returns { id, slug, filePath }. */
function writeInboxItem(args) {
  const { ecosystemRoot, swarmId, repo, slug, question, options = [], nowIso } = args;
  ensureLayout(ecosystemRoot, swarmId);
  try {
    return core.writeItem({
      baseDir: baseDir(ecosystemRoot, swarmId),
      scope: repo,
      slug,
      question,
      options,
      nowIso,
      fieldLabel: FIELD_LABEL,
      withLock: manifestLib.withLock,
    });
  } catch (err) {
    // Preserve swarm's original error vocabulary — callers and tests match on it.
    if (err instanceof TypeError) {
      throw new TypeError(err.message
        .replace(/^writeItem: invalid scope/, 'writeInboxItem: invalid repo')
        .replace(/^writeItem:/, 'writeInboxItem:'));
    }
    throw err;
  }
}

/** Conductor-side: list pending items (excluding resolved/). */
function listPendingInboxItems(ecosystemRoot, swarmId) {
  return core.listPending(baseDir(ecosystemRoot, swarmId))
    // Swarm's item shape names the scope `repo`; keep it.
    .map(({ id, slug, scope, asked, status, filePath }) => ({
      id, slug, repo: scope, asked, status, filePath,
    }));
}

/** Conductor-side: resolve an item with the user's answer. */
function resolveInboxItem(args) {
  const { ecosystemRoot, swarmId, id, answer, nowIso } = args;
  ensureLayout(ecosystemRoot, swarmId);
  try {
    return core.resolveItem({
      baseDir: baseDir(ecosystemRoot, swarmId),
      id,
      answer,
      nowIso,
      fieldLabel: FIELD_LABEL,
      withLock: manifestLib.withLock,
      onResolved: () => {
        manifestLib.appendAudit(ecosystemRoot, swarmId, {
          ts: nowIso,
          actor: 'conductor',
          event: 'inbox-resolved',
          detail: `${id} — ${answer.slice(0, 200)}`,
        });
      },
    });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new TypeError(err.message.replace(/^resolveItem:/, 'resolveInboxItem:'));
    }
    if (err instanceof Error && /^resolveItem: no pending inbox item/.test(err.message)) {
      throw new Error(err.message.replace(/^resolveItem:/, 'resolveInboxItem:'));
    }
    throw err;
  }
}

/** Regenerate inbox/INDEX.md from pending items. */
function rebuildIndex(ecosystemRoot, swarmId) {
  ensureLayout(ecosystemRoot, swarmId);
  return core.rebuildIndex(baseDir(ecosystemRoot, swarmId), { fieldLabel: FIELD_LABEL });
}

module.exports = {
  INBOX_DIR,
  RESOLVED_DIR,
  INDEX_FILENAME,
  inboxDir,
  resolvedDir,
  indexPath,
  ensureLayout,
  nextInboxId,
  writeInboxItem,
  listPendingInboxItems,
  resolveInboxItem,
  rebuildIndex,
};
