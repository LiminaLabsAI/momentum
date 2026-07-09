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
  console.error('usage: momentum team <whoami|sync|board|record|compile>');
  return 1;
}

module.exports = { runTeam, runClaim };
