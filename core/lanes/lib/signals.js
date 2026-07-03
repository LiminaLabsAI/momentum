'use strict';

/**
 * `momentum lanes signal` / `momentum lanes inbox` — cross-session lane
 * signaling (Phase 21b G4, FEAT-026 — see ADR-0002).
 *
 * A signal is one JSON file written under the state lock into the lane's
 * inbox at the shared git dir:
 *
 *   <git-common-dir>/momentum/lanes/<id>/inbox/NNNN-<type>.json
 *
 * Because the anchor lives in the git common dir, a signal written from
 * ANY worktree (or session) is readable from any other — no daemon, no
 * sockets, just files. Ack moves the file to inbox/processed/; seqs are
 * monotonic across BOTH unread and processed history, so acking never
 * causes a seq to be reused.
 *
 * Contract with bin/lanes.js: print our own errors, return 1 on failure,
 * undefined on success. Zero dependencies — node builtins only.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const state = require('./state');

const SEQ_WIDTH = 4;

// ─── helpers ─────────────────────────────────────────────────────────────

function fail(msg) {
  console.error(`✗ ${msg}`);
  return 1;
}

/** Current branch of the sender's worktree; 'unknown' outside a repo. */
function currentBranch(cwd) {
  const res = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd, encoding: 'utf8',
  });
  if (res.status !== 0) return 'unknown';
  return res.stdout.trim() || 'unknown';
}

/** Local copy of the state.js writeJsonAtomic idiom (not exported there). */
function writeJsonAtomic(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`
  );
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + os.EOL);
  fs.renameSync(tmp, file);
}

/** Leading-4-digit seqs of *.json filenames in dir; [] when unreadable. */
function seqsIn(dir) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((n) => n.endsWith('.json'))
    .map((n) => (/^(\d{4})-/.exec(n) || [])[1])
    .filter(Boolean)
    .map(Number);
}

/** Next seq = 1 + max across unread AND processed (0 when none). */
function nextSeq(anchor, id) {
  const all = [
    ...seqsIn(state.inboxDir(anchor, id)),
    ...seqsIn(state.processedDir(anchor, id)),
  ];
  return (all.length ? Math.max(...all) : 0) + 1;
}

function pad(seq) {
  return String(seq).padStart(SEQ_WIDTH, '0');
}

/** Seq of an unread entry — body when sane, filename digits as fallback. */
function seqOf(sig) {
  if (Number.isInteger(sig.seq)) return sig.seq;
  const m = /^(\d{4})-/.exec(sig.file || '');
  return m ? Number(m[1]) : NaN;
}

// ─── momentum lanes signal <id> <type> [text ...] ────────────────────────

function cmdSignal(cwd, argv) {
  const usage = 'usage: momentum lanes signal <lane-id> <pause|resume|redirect|kill|message> [text ...]';
  const [id, type, ...rest] = argv || [];
  if (!id || !type) return fail(usage);

  const anchor = state.resolveAnchor(cwd);
  if (!anchor) return fail('not inside a git repository');
  if (!state.readManifest(anchor, id)) return fail(`no such lane: '${id}'`);
  if (!state.SIGNAL_TYPES.includes(type)) {
    return fail(`invalid signal type '${type}' (expected ${state.SIGNAL_TYPES.join('|')})`);
  }

  const text = rest.join(' ').trim();
  if (!text && (type === 'redirect' || type === 'message')) {
    console.log(`⚠ '${type}' usually carries text — writing the signal without any`);
  }

  let name;
  try {
    state.withLock(anchor, () => {
      const seq = nextSeq(anchor, id);
      name = `${pad(seq)}-${type}`;
      writeJsonAtomic(path.join(state.inboxDir(anchor, id), `${name}.json`), {
        stateVersion: state.STATE_VERSION,
        seq,
        type,
        text: text || null,
        from: currentBranch(cwd),
        at: new Date().toISOString(),
      });
    });
  } catch (err) {
    return fail(err.message);
  }
  console.log(`✓ signal ${name} → lane '${id}'`);
}

// ─── momentum lanes inbox <id> [--ack <seq>|--ack-all] ───────────────────

function cmdInbox(cwd, argv) {
  const usage = 'usage: momentum lanes inbox <lane-id> [--ack <seq>|--ack-all]';
  let id = null;
  let ack = null;
  let ackAll = false;
  const args = argv || [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--ack-all') {
      ackAll = true;
    } else if (a === '--ack') {
      const v = args[++i];
      if (v === undefined || !/^\d+$/.test(v)) return fail(`--ack needs a numeric seq — ${usage}`);
      ack = Number(v);
    } else if (a.startsWith('--')) {
      return fail(`unknown flag '${a}' — ${usage}`);
    } else if (!id) {
      id = a;
    } else {
      return fail(`unexpected argument '${a}' — ${usage}`);
    }
  }
  if (!id) return fail(usage);

  const anchor = state.resolveAnchor(cwd);
  if (!anchor) return fail('not inside a git repository');
  if (!state.readManifest(anchor, id)) return fail(`no such lane: '${id}'`);

  // ── ack path ──
  if (ack !== null || ackAll) {
    let acked;
    try {
      acked = state.withLock(anchor, () => {
        const unread = state.unreadSignals(anchor, id);
        const targets = ackAll ? unread : unread.filter((s) => seqOf(s) === ack);
        if (!ackAll && targets.length === 0) {
          throw new Error(`no unread signal with seq ${pad(ack)} in lane '${id}'`);
        }
        const dest = state.processedDir(anchor, id);
        fs.mkdirSync(dest, { recursive: true });
        for (const s of targets) {
          fs.renameSync(
            path.join(state.inboxDir(anchor, id), s.file),
            path.join(dest, s.file)
          );
        }
        return targets;
      });
    } catch (err) {
      return fail(err.message);
    }
    if (acked.length === 0) {
      console.log('inbox empty — nothing to ack');
      return;
    }
    for (const s of acked) {
      console.log(`✓ acked ${s.file.replace(/\.json$/, '')} → processed/`);
    }
    return;
  }

  // ── list path (lock-free, oldest first) ──
  const unread = state.unreadSignals(anchor, id);
  if (unread.length === 0) {
    console.log('inbox empty');
    return;
  }
  for (const s of unread) {
    const text = s.text === null || s.text === undefined ? '-' : s.text;
    console.log(`${pad(seqOf(s))} ${s.type} ${s.from} ${s.at} — ${text}`);
  }
}

module.exports = { cmdSignal, cmdInbox };
