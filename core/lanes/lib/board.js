'use strict';

/**
 * `momentum lanes` board + `momentum lanes queue` (Phase 21b G3, FEAT-026).
 *
 * Both commands are computed views over the lane manifests at
 * <git-common-dir>/momentum/lanes (state.js, ADR-0002) — any session, any
 * worktree, no daemon. The board ALWAYS ends with the queue-pressure
 * footer: count of done-but-unlanded lanes + oldest wait (platform
 * decision 4 — WIP unbounded, back-pressure visible, never a gate).
 *
 * `--json` output is INTERNAL (stateVersion 1) and marked `unstable: true`;
 * publishing the shape as a contract is the 21c one-way-door decision.
 *
 * Contract with bin/lanes.js: print own errors, return 1 on failure,
 * 0/undefined on success. Zero dependencies — node builtins only.
 */

const { spawnSync } = require('child_process');

const state = require('./state');

// ─── helpers ─────────────────────────────────────────────────────────────

function fail(msg) {
  console.error(`✗ ${msg}`);
  return 1;
}

function hasJsonFlag(argv) {
  return Array.isArray(argv) && argv.includes('--json');
}

/** Humanized time since `iso`: 3m, 2h, 1d4h. '?' when unparseable. */
function humanAge(iso, nowMs = Date.now()) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '?';
  const mins = Math.max(0, Math.floor((nowMs - then) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `${days}d${remHours}h` : `${days}d`;
}

/** `phase:phase-3-x` | `adhoc:fix-BUG-7-z` | `unbound` (ref-less). */
function planLabel(planNode) {
  if (!planNode || !planNode.type) return 'unbound';
  return planNode.ref ? `${planNode.type}:${planNode.ref}` : planNode.type;
}

/** Queue pressure over all lanes: done count + earliest doneAt. */
function queuePressure(lanes) {
  const done = lanes.filter((l) => l.status === 'done');
  const oldestDoneAt = done.map((l) => l.doneAt).filter(Boolean).sort()[0] || null;
  return { doneCount: done.length, oldestDoneAt };
}

/** True when HEAD (this worktree) is already contained in the lane branch. */
function isFresh(cwd, branch) {
  const res = spawnSync('git', ['merge-base', '--is-ancestor', 'HEAD', branch], {
    cwd, encoding: 'utf8',
  });
  return res.status === 0;
}

function currentBranch(cwd) {
  const res = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd, encoding: 'utf8',
  });
  return res.status === 0 ? res.stdout.trim() : 'HEAD';
}

// ─── momentum lanes (board) ──────────────────────────────────────────────

function cmdBoard(cwd, argv) {
  const json = hasJsonFlag(argv);
  const anchor = state.resolveAnchor(cwd);
  if (!anchor) return fail('not inside a git repository');

  const lanes = state.listLanes(anchor);
  const visible = lanes.filter((l) => l.status !== 'closed');
  const pressure = queuePressure(lanes);

  if (json) {
    console.log(JSON.stringify({
      stateVersion: state.STATE_VERSION,
      unstable: true, // internal shape per ADR-0002 — may change without notice
      lanes: visible.map((l) => ({
        ...l,
        unread: state.unreadCount(anchor, l.id),
        overlaps: state.overlapWarnings(anchor, l.id, l.touches),
      })),
      queue: pressure,
    }, null, 2));
    return 0;
  }

  if (visible.length === 0) {
    console.log('no lanes — open one with: momentum lanes open <branch>');
    console.log('queue: empty — nothing awaiting landing');
    return 0;
  }

  for (const lane of visible) {
    let line = `● ${lane.id}  ${planLabel(lane.planNode)}  ${lane.grade}  ${lane.status}  ${humanAge(lane.opened)}`;
    const unread = state.unreadCount(anchor, lane.id);
    if (unread > 0) line += ` ✉${unread}`;
    if (state.overlapWarnings(anchor, lane.id, lane.touches).length > 0) line += ' ⚠overlap';
    console.log(line);
  }

  if (pressure.doneCount > 0) {
    console.log(`queue: ${pressure.doneCount} done awaiting landing — oldest waiting ${humanAge(pressure.oldestDoneAt)}`);
  } else {
    console.log('queue: empty — nothing awaiting landing');
  }
  return 0;
}

// ─── momentum lanes queue ────────────────────────────────────────────────

function cmdQueue(cwd, argv) {
  const json = hasJsonFlag(argv);
  const anchor = state.resolveAnchor(cwd);
  if (!anchor) return fail('not inside a git repository');

  const queue = state.listLanes(anchor)
    .filter((l) => l.status === 'done')
    .sort((a, b) => String(a.doneAt).localeCompare(String(b.doneAt)));

  if (json) {
    console.log(JSON.stringify({
      stateVersion: state.STATE_VERSION,
      unstable: true, // internal shape per ADR-0002 — may change without notice
      queue: queue.map((l, i) => ({
        ...l,
        position: i + 1,
        fresh: isFresh(cwd, l.branch),
      })),
    }, null, 2));
    return 0;
  }

  if (queue.length === 0) {
    console.log('landing queue empty');
    return 0;
  }

  const integration = currentBranch(cwd);
  queue.forEach((l, i) => {
    const fresh = isFresh(cwd, l.branch);
    let line = `${i + 1}. ${l.id}  grade=${l.grade}  done=${l.doneAt}  ${fresh ? 'fresh' : 'stale'}`;
    if (!fresh) line += ` — rebase onto ${integration} before landing`;
    console.log(line);
  });
  return 0;
}

module.exports = { cmdBoard, cmdQueue };
