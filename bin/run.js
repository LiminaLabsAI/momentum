'use strict';

/**
 * `momentum run` — the autonomous-execution CLI (Phase 32a, Epic 0001).
 *
 *   momentum run start <tier> <target> [--unit U] [--turns N] [--minutes N]
 *   momentum run status [--json]
 *   momentum run continue
 *   momentum run stop [--reason "..."]
 *
 * `status` is deliberately read-only and safe to run against a LIVE run: it is
 * the pre-mortem's mitigation for the silent-wrong-turn failure — an operator
 * can see every decision the agent took under its own authority, and every
 * parked question, without interrupting anything.
 */

const fs = require('fs');
const path = require('path');

const MOMENTUM_ROOT = path.resolve(__dirname, '..');
const manifestLib = require(path.join(MOMENTUM_ROOT, 'core', 'run', 'lib', 'manifest'));
const governor = require(path.join(MOMENTUM_ROOT, 'core', 'run', 'lib', 'governor'));

const USAGE = `momentum run — autonomous execution (Phase 32a, Epic 0001)

Usage:
  momentum run start <tier> <target>   Start a run. tier = group|phase|epic|initiative
      [--unit <id>]                    First unit (default: <target>)
      [--turns N] [--minutes N]        Budget — omit for unbounded
      [--release per-phase|per-feature|manual]
      [--tdd strict|opt-in]
  momentum run status [--json]         Read-only; safe against a live run
  momentum run continue                Clear a stop and resume from the manifest
  momentum run stop [--reason "..."]   Halt the run

Operator halt from any shell, no momentum command needed:
  touch .momentum/run-stop
`;

function flag(args, name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function repoRoot() {
  return process.env.MOMENTUM_RUN_ROOT || process.cwd();
}

// ─────────────────────────────────────────────────────────────────────────────

function cmdStart(args) {
  const [tier, target] = args;
  if (!tier || !target) {
    console.error('Error: momentum run start <tier> <target>');
    return 1;
  }
  if (!manifestLib.TIERS.includes(tier)) {
    console.error(`Error: invalid tier "${tier}" — expected one of ${manifestLib.TIERS.join(', ')}`);
    return 1;
  }

  const root = repoRoot();
  const existing = manifestLib.loadSafe(root);
  if (existing && existing.status === 'running') {
    console.error(`Error: a run is already active (${existing.run_id} — ${existing.tier}:${existing.target}).`);
    console.error('Stop it first: momentum run stop');
    return 1;
  }

  const budget = {};
  const turns = flag(args, '--turns');
  const minutes = flag(args, '--minutes');
  if (turns) budget.turns = parseInt(turns, 10);
  if (minutes) budget.wall_clock_minutes = parseInt(minutes, 10);

  const policy = {
    release: flag(args, '--release', 'per-phase'),
    push: 'per-phase',
    tdd: flag(args, '--tdd', 'strict'),
  };

  // The kill switch is single-use per run — a stale one from a previous run
  // would halt this one on its first turn.
  manifestLib.clearKillSwitch(root);

  const m = manifestLib.create({
    repoRoot: root,
    tier,
    target,
    unit: flag(args, '--unit', target),
    policy,
    budget: Object.keys(budget).length ? budget : undefined,
    nowIso: nowIso(),
  });

  console.log(`▸ Run started: ${m.run_id}`);
  console.log(`  Tier:    ${m.tier}`);
  console.log(`  Target:  ${m.target}`);
  console.log(`  Unit:    ${m.cursor.unit}`);
  console.log(`  Policy:  release=${m.policy.release} push=${m.policy.push} tdd=${m.policy.tdd}`);
  if (m.budget) {
    const parts = [];
    if (m.budget.turns) parts.push(`${m.budget.turns} turns`);
    if (m.budget.wall_clock_minutes) parts.push(`${m.budget.wall_clock_minutes} min`);
    console.log(`  Budget:  ${parts.join(', ')}`);
  } else {
    console.log('  Budget:  unbounded');
  }
  console.log('');
  console.log('  Halt any time:  touch .momentum/run-stop');
  return 0;
}

function cmdStatus(args) {
  const root = repoRoot();
  const m = manifestLib.loadSafe(root);
  const json = args.includes('--json');

  if (!m) {
    if (json) { process.stdout.write(`${JSON.stringify({ run: null }, null, 2)}\n`); return 0; }
    console.log('No active run.');
    return 0;
  }

  if (json) {
    process.stdout.write(`${JSON.stringify(m, null, 2)}\n`);
    return 0;
  }

  const parked = (m.parked || []).filter((p) => !p.resolved);
  const spent = m.spent || {};

  console.log(`▸ Run ${m.run_id} — ${m.status}`);
  console.log(`  ${m.tier}: ${m.target}`);
  console.log(`  Cursor:  ${m.cursor && m.cursor.unit}`);
  console.log(`  Turns:   ${spent.turns || 0}${m.budget && m.budget.turns ? `/${m.budget.turns}` : ''}`);
  console.log(`  Policy:  release=${m.policy.release} tdd=${m.policy.tdd}`);

  if (manifestLib.killSwitchEngaged(root)) {
    console.log('  ⚠ kill switch ENGAGED — clear it with: momentum run continue');
  }

  // Decisions the agent took alone. Reading these mid-run is how an operator
  // catches a wrong turn before three more units build on it.
  const decisions = m.decisions || [];
  console.log('');
  if (decisions.length === 0) {
    console.log('  Decisions taken autonomously: none');
  } else {
    console.log(`  Decisions taken autonomously (${decisions.length}):`);
    for (const d of decisions.slice(-10)) {
      console.log(`    - [${d.unit}] ${d.summary}`);
      if (d.rationale) console.log(`        ${d.rationale}`);
    }
  }

  console.log('');
  if (parked.length === 0) {
    console.log('  Parked questions: none');
  } else {
    console.log(`  Parked questions (${parked.length}) — these units are frozen, others proceed:`);
    for (const p of parked) {
      console.log(`    - ${p.id} [${p.blocked_unit}] ${p.question}   (${p.reason || 'unclassified'})`);
    }
  }

  if (m.status === 'stopped') {
    const last = (m.audit || []).filter((a) => a.event === 'stop').pop();
    if (last && last.detail) {
      console.log('');
      console.log(`  Stopped because: ${last.detail}`);
    }
  }
  return 0;
}

function cmdContinue() {
  const root = repoRoot();
  const m = manifestLib.loadSafe(root);
  if (!m) { console.error('Error: no run to continue.'); return 1; }
  if (m.status === 'complete' || m.status === 'failed') {
    console.error(`Error: run is ${m.status} — start a new one.`);
    return 1;
  }

  manifestLib.clearKillSwitch(root);
  manifestLib.setStatus(root, 'running', nowIso(), 'resumed by operator');
  console.log(`▸ Run ${m.run_id} resumed at ${m.cursor && m.cursor.unit}.`);

  const parked = (m.parked || []).filter((p) => !p.resolved);
  if (parked.length) {
    console.log(`  ${parked.length} question(s) still parked — those units stay frozen.`);
  }
  return 0;
}

function cmdStop(args) {
  const root = repoRoot();
  const m = manifestLib.loadSafe(root);
  if (!m) { console.error('Error: no active run.'); return 1; }

  manifestLib.setStatus(root, 'stopped', nowIso(), flag(args, '--reason', 'stopped by operator'));
  console.log(`▸ Run ${m.run_id} stopped at ${m.cursor && m.cursor.unit}.`);
  console.log('  Resume with: momentum run continue');
  return 0;
}

function runRun(args) {
  const sub = args[0];
  const rest = args.slice(1);

  switch (sub) {
    case 'start': return cmdStart(rest);
    case 'status': return cmdStatus(rest);
    case 'continue': return cmdContinue(rest);
    case 'stop': return cmdStop(rest);
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      process.stdout.write(USAGE);
      return 0;
    default:
      console.error(`Unknown subcommand: ${sub}\n`);
      process.stdout.write(USAGE);
      return 1;
  }
}

module.exports = { runRun, USAGE };
