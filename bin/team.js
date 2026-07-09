'use strict';

/**
 * `momentum team` + `momentum claim` — git-native team coordination (Phase 30a
 * Team-Walk, ADR-0012). No daemon; every command computes from git + files.
 *
 *   momentum claim <namespace> <key>   atomic cross-machine allocation (ref-CAS)
 *   momentum team whoami               show the resolved durable actor
 *   momentum team sync                 fetch coordination refs + recompile views
 */

const path = require('path');
const { spawnSync } = require('child_process');

const MOMENTUM_ROOT = path.resolve(__dirname, '..');
const claimLib = require(path.join(MOMENTUM_ROOT, 'core', 'team', 'lib', 'claim'));
const refcas = require(path.join(MOMENTUM_ROOT, 'core', 'team', 'lib', 'refcas'));
const compile = require(path.join(MOMENTUM_ROOT, 'core', 'team', 'lib', 'compile'));
const presenceLib = require(path.join(MOMENTUM_ROOT, 'core', 'team', 'lib', 'presence'));
const approvalsLib = require(path.join(MOMENTUM_ROOT, 'core', 'team', 'lib', 'approvals'));
const queueLib = require(path.join(MOMENTUM_ROOT, 'core', 'team', 'lib', 'queue'));
const leaseLib = require(path.join(MOMENTUM_ROOT, 'core', 'team', 'lib', 'lease'));
const { createRelay } = require(path.join(MOMENTUM_ROOT, 'core', 'team', 'relay', 'server'));
const { CONTRACT } = require(path.join(MOMENTUM_ROOT, 'core', 'team', 'contract'));
const identity = require(path.join(MOMENTUM_ROOT, 'core', 'identity'));

function repoRoot(cwd) {
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') flags.json = true;
    else if (a.startsWith('--')) flags[a.slice(2)] = argv[++i];
    else positional.push(a);
  }
  return { flags, positional };
}

function insideRepo(cwd) {
  return spawnSync('git', ['rev-parse', '--git-dir'], { cwd, encoding: 'utf8' }).status === 0;
}

// ─── momentum claim ────────────────────────────────────────────────────────

function runClaim(argv) {
  const { flags, positional } = parseFlags(argv);
  const [namespace, key] = positional;
  if (!namespace || !key) {
    console.error('usage: momentum claim <namespace> <key> [--remote origin] [--actor id]');
    console.error('  e.g. momentum claim phase 30a  |  momentum claim version 0.37.0  |  momentum claim id BUG-028');
    return 1;
  }
  const cwd = process.cwd();
  if (!insideRepo(cwd)) { console.error('✗ not inside a git repository'); return 1; }
  const actor = flags.actor || identity.resolveActor(cwd).id;
  let res;
  try {
    res = claimLib.claimKey(cwd, namespace, key, { remote: flags.remote, actor });
  } catch (err) {
    console.error(`✗ claim failed: ${err.message}`);
    return 1;
  }
  if (res.won) {
    console.log(`✓ claimed ${namespace}/${key} as '${actor}'  (${res.ref})`);
    return 0;
  }
  const who = res.winner && res.winner.actor ? res.winner.actor : 'someone else';
  console.error(`✗ ${namespace}/${key} already claimed by '${who}' — pick another`);
  return 2; // distinct from usage(1) so recipes can gate on "lost"
}

// ─── momentum team ─────────────────────────────────────────────────────────

function runTeam(argv) {
  const sub = argv[0];
  const cwd = process.cwd();
  if (sub === 'whoami') {
    const a = identity.resolveActor(cwd);
    console.log(`${a.id}  (source: ${a.source}${a.email ? `, ${a.email}` : ''})`);
    return 0;
  }
  if (sub === 'sync') {
    if (!insideRepo(cwd)) { console.error('✗ not inside a git repository'); return 1; }
    const remote = argv[1] && !argv[1].startsWith('--') ? argv[1] : 'origin';
    const ok = refcas.fetchAll(cwd, remote);
    const root = repoRoot(cwd);
    const rec = root ? compile.compileStatusFile(root) : { changed: false };
    console.log(ok
      ? `✓ synced coordination refs from ${remote} (refs/momentum/*). Fragments arrive via branch integration.`
      : `⚠ could not fetch from ${remote} — working offline; coordination is eventually consistent`);
    if (rec.changed) console.log('✓ recompiled the Active-Phase table in specs/status.md');
    return 0;
  }
  if (sub === 'compile') {
    const root = repoRoot(cwd);
    if (!root) { console.error('✗ not inside a git repository'); return 1; }
    const rec = compile.compileStatusFile(root);
    console.log(rec.path
      ? (rec.changed ? '✓ recompiled Active-Phase table in specs/status.md' : '✓ specs/status.md already current')
      : 'ℹ no specs/status.md to compile into');
    return 0;
  }
  if (sub === 'board') {
    const root = repoRoot(cwd);
    if (!root) { console.error('✗ not inside a git repository'); return 1; }
    console.log(compile.compileActivePhase(root));
    return 0;
  }
  if (sub === 'record') {
    const root = repoRoot(cwd);
    if (!root) { console.error('✗ not inside a git repository'); return 1; }
    const { flags } = parseFlags(argv.slice(1));
    if (!flags.branch) { console.error('usage: momentum team record --branch B [--phase P] [--status S] [--progress "..."]'); return 1; }
    const actor = flags.actor || identity.resolveActor(root).id;
    compile.recordActivePhase(root, actor, {
      branch: flags.branch, phase: flags.phase || '', status: flags.status || '', progress: flags.progress || '',
    });
    console.log(`✓ recorded active-phase row for '${flags.branch}' as '${actor}'`);
    return 0;
  }
  if (sub === 'heartbeat') {
    const root = repoRoot(cwd);
    if (!root) { console.error('✗ not inside a git repository'); return 1; }
    const { flags } = parseFlags(argv.slice(1));
    const actor = flags.actor || identity.resolveActor(root).id;
    presenceLib.heartbeat(root, actor, { branch: flags.branch, lane: flags.lane, activity: flags.activity });
    console.log(`✓ heartbeat for '${actor}'`);
    return 0;
  }
  if (sub === 'presence') {
    const root = repoRoot(cwd);
    if (!root) { console.error('✗ not inside a git repository'); return 1; }
    const now = Date.now();
    const list = presenceLib.presence(root, now);
    if (!list.length) { console.log('(no presence recorded)'); return 0; }
    for (const p of list) {
      console.log(`${p.liveness === 'active' ? '●' : p.liveness === 'idle' ? '◐' : '○'} ${p.actor}  ${p.liveness}  ${p.branch || ''}${p.activity ? '  — ' + p.activity : ''}`);
    }
    return 0;
  }
  if (sub === 'approve') {
    const root = repoRoot(cwd);
    if (!root) { console.error('✗ not inside a git repository'); return 1; }
    const { flags, positional } = parseFlags(argv.slice(1));
    const change = positional[0];
    if (!change) { console.error('usage: momentum team approve <change> [--verdict approve|reject]'); return 1; }
    const actor = flags.actor || identity.resolveActor(root).id;
    approvalsLib.approve(root, actor, change, { verdict: flags.verdict || 'approve' });
    console.log(`✓ ${flags.verdict === 'reject' ? 'rejected' : 'approved'} '${change}' as '${actor}'`);
    return 0;
  }
  if (sub === 'check') {
    const root = repoRoot(cwd);
    if (!root) { console.error('✗ not inside a git repository'); return 1; }
    const { flags, positional } = parseFlags(argv.slice(1));
    const change = positional[0];
    if (!change || !flags.author) { console.error('usage: momentum team check <change> --author <a> [--threshold N] [--allow-self]'); return 1; }
    const threshold = flags.threshold ? parseInt(flags.threshold, 10) : 1;
    const allowSelf = argv.includes('--allow-self');
    const approvers = approvalsLib.approversFor(root, change, flags.author, allowSelf);
    if (approvers.length >= threshold) {
      console.log(`✓ '${change}' satisfied — ${approvers.length}/${threshold} approval(s): ${approvers.join(', ')}`);
      return 0;
    }
    console.error(`✗ '${change}' not satisfied — ${approvers.length}/${threshold} peer approval(s)${allowSelf ? '' : ' (author self-approval does not count)'}`);
    return 2;
  }
  if (sub === 'turn') {
    const root = repoRoot(cwd);
    if (!root) { console.error('✗ not inside a git repository'); return 1; }
    const action = argv[1];
    const runway = argv[2] || 'main';
    const actor = identity.resolveActor(root).id;
    if (action === 'take') {
      const r = queueLib.takeTurn(root, runway, actor);
      if (r.held) { console.log(`✓ took the '${runway}' landing turn as '${actor}'`); return 0; }
      console.error(`✗ '${runway}' turn held by '${r.holder}' — wait or coordinate`); return 2;
    }
    if (action === 'release') { queueLib.releaseTurn(root, runway); console.log(`✓ released the '${runway}' turn`); return 0; }
    if (action === 'holder') { const h = queueLib.turnHolder(root, runway); console.log(h ? `${runway}: held by '${h}'` : `${runway}: free`); return 0; }
    console.error('usage: momentum team turn <take|release|holder> [runway]');
    return 1;
  }
  if (sub === 'lease') {
    const root = repoRoot(cwd);
    if (!root) { console.error('✗ not inside a git repository'); return 1; }
    const action = argv[1];
    const resource = argv[2];
    if (!action || !resource) { console.error('usage: momentum team lease <acquire|release|owner> <resource>'); return 1; }
    const actor = identity.resolveActor(root).id;
    if (action === 'acquire') {
      const r = leaseLib.acquireLease(root, resource, actor);
      if (r.held) { console.log(`✓ leased '${resource}' as '${actor}'`); return 0; }
      console.error(`✗ '${resource}' leased by '${r.owner}'`); return 2;
    }
    if (action === 'release') { leaseLib.releaseLease(root, resource); console.log(`✓ released lease '${resource}'`); return 0; }
    if (action === 'owner') { const o = leaseLib.leaseOwner(root, resource); console.log(o ? `${resource}: owned by '${o}'` : `${resource}: free`); return 0; }
    console.error('usage: momentum team lease <acquire|release|owner> <resource>');
    return 1;
  }
  if (sub === 'contract') {
    console.log(JSON.stringify(CONTRACT, null, 2));
    return 0;
  }
  if (sub === 'relay') {
    const { flags } = parseFlags(argv.slice(1));
    const relay = createRelay({ port: flags.port ? parseInt(flags.port, 10) : 0 });
    relay.listen((port) => {
      console.log(`✓ momentum coordination relay (authority-free) on http://127.0.0.1:${port}`);
      console.log(`  set relay_url=http://127.0.0.1:${port} for teammates; Ctrl-C to stop.`);
    });
    return 0; // server keeps the process alive
  }
  console.error('usage: momentum team <whoami|sync|board|record|compile|heartbeat|presence|approve|check|turn|lease|contract|relay>');
  return 1;
}

module.exports = { runTeam, runClaim };
