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
const authority = require(path.join(MOMENTUM_ROOT, 'core', 'run', 'lib', 'authority'));

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

During a run — how the agent records what it did:
  momentum run advance <unit>          Move the cursor to the next unit
  momentum run decide "<summary>"      Log a decision taken under agent authority
      [--unit U] [--why "<rationale>"]
  momentum run park "<question>"       Park an operator decision. NON-BLOCKING:
      --unit U [--reason R]            freezes only <unit>; everything else proceeds
  momentum run resolve <id> "<answer>" Answer a parked question
  momentum run strike [--unit U]       Record a failure on the current unit
  momentum run clear-strikes [--unit U]

Mid-run operator changes (D11):
  momentum run amend "<change>"        --forward-only  absorbed, zero prompts
      [--invalidates u1,u2]            names completed work -> hard stop
  momentum run derive <phase> --epic S Derive specs from the epic. No interview.
      [--deps a,b] [--write]

Scope grant (ADR-0020) — one approval, N landings, ONE epic:
  momentum run grant --branches a,b   Mint. [--hours N] [--landings N] [--epic S]
      [--hours 8]
  momentum run grant status           Show scope, expiry, budget, consumptions
  momentum run grant revoke           Effective on the next verification

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
  const parkLimit = (m.policy && m.policy.park_threshold) || governor.DEFAULT_PARK_THRESHOLD;
  if (parked.length === 0) {
    console.log(`  Parked questions: none  (run stops at ${parkLimit})`);
  } else {
    console.log(`  Parked questions (${parked.length}/${parkLimit}) — these units are frozen, others proceed:`);
    for (const p of parked) {
      // ADR-0019 classification: why this landed with the operator at all.
      const why = p.reason === authority.REASON.OPERATOR_AUTHORITY
        ? 'a Rule-14 trigger fired'
        : p.reason === authority.REASON.AMBIGUOUS
          ? 'nothing matched — parked rather than guessed'
          : (p.reason || 'unclassified');
      console.log(`    - ${p.id} [${p.blocked_unit}] ${p.question}`);
      console.log(`        ${why}`);
    }
    console.log('');
    console.log('  Answer one:  momentum run resolve <id> "<answer>"');
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

// ─────────────────────────────────────────────────────────────────────────────
// During a run — how the agent records what it did.
//
// Without these, `decisions[]` and `parked[]` would stay empty forever: the
// manifest would have a state API with no production caller, which is BUG-031's
// shape exactly. The orphan guard in tests/run-reachability.test.js caught this
// omission, which is the point of having it.
// ─────────────────────────────────────────────────────────────────────────────

function requireActiveRun() {
  const root = repoRoot();
  const m = manifestLib.loadSafe(root);
  if (!m) { console.error('Error: no active run.'); return null; }
  return { root, m };
}

function cmdAdvance(args) {
  const unit = args[0];
  if (!unit) { console.error('Error: momentum run advance <unit>'); return 1; }
  const active = requireActiveRun();
  if (!active) return 1;

  manifestLib.advance(active.root, unit, nowIso());
  console.log(`▸ Cursor → ${unit}`);
  return 0;
}

function cmdDecide(args) {
  const summary = args[0];
  if (!summary) { console.error('Error: momentum run decide "<summary>" [--unit U] [--why R]'); return 1; }
  const active = requireActiveRun();
  if (!active) return 1;

  const unit = flag(args, '--unit', active.m.cursor && active.m.cursor.unit);
  manifestLib.recordDecision(active.root, {
    unit,
    summary,
    rationale: flag(args, '--why', ''),
    triggers_evaluated: [],
  }, nowIso());

  console.log(`▸ Decision logged on ${unit}: ${summary}`);
  return 0;
}

function cmdPark(args) {
  const question = args[0];
  const unit = flag(args, '--unit');
  if (!question || !unit) {
    console.error('Error: momentum run park "<question>" --unit <unit> [--reason operator-authority|ambiguous]');
    return 1;
  }
  const active = requireActiveRun();
  if (!active) return 1;

  const id = String((active.m.parked || []).length + 1).padStart(4, '0');
  manifestLib.recordPark(active.root, {
    id,
    question,
    blocked_unit: unit,
    reason: flag(args, '--reason', 'ambiguous'),
    context: flag(args, '--context', ''),
  }, nowIso());

  console.log(`▸ Parked ${id} on ${unit}: ${question}`);
  console.log('  This freezes ONLY that unit — continue with everything else.');
  return 0;
}

function cmdResolve(args) {
  const [id, answer] = args;
  if (!id || !answer) { console.error('Error: momentum run resolve <id> "<answer>"'); return 1; }
  const active = requireActiveRun();
  if (!active) return 1;

  try {
    manifestLib.resolvePark(active.root, id, answer, nowIso());
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }
  console.log(`▸ Resolved ${id}. That unit is unfrozen.`);
  return 0;
}

function cmdStrike(args) {
  const active = requireActiveRun();
  if (!active) return 1;

  const unit = flag(args, '--unit', active.m.cursor && active.m.cursor.unit);
  const after = manifestLib.recordStrike(active.root, unit, nowIso());
  const count = after.strikes[unit];
  const limit = (after.policy && after.policy.strike_limit) || governor.DEFAULT_STRIKE_LIMIT;

  console.log(`▸ Strike ${count}/${limit} on ${unit}`);
  if (count >= limit) console.log('  Limit reached — the governor will stop the run on the next turn.');
  return 0;
}

function cmdClearStrikes(args) {
  const active = requireActiveRun();
  if (!active) return 1;

  const unit = flag(args, '--unit', active.m.cursor && active.m.cursor.unit);
  manifestLib.clearStrikes(active.root, unit);
  console.log(`▸ Strikes cleared on ${unit}`);
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scope grant (ADR-0020) — one approval, N landings, for ONE epic
// ─────────────────────────────────────────────────────────────────────────────

const grantLib = require(path.join(MOMENTUM_ROOT, 'core', 'run', 'lib', 'grant'));
const amendLib = require(path.join(MOMENTUM_ROOT, 'core', 'run', 'lib', 'amend'));
const deriveLib = require(path.join(MOMENTUM_ROOT, 'core', 'run', 'lib', 'derive'));

function gitEmail(cwd) {
  const r = require('child_process').spawnSync('git', ['config', 'user.email'], { cwd, encoding: 'utf8' });
  return (r.stdout || '').trim() || 'unknown';
}

function cmdGrant(args) {
  const active = requireActiveRun();
  if (!active) return 1;

  const sub = args[0];
  if (sub === 'revoke') {
    const r = grantLib.revoke(active.root, nowIso());
    if (!r.ok) { console.error(`Error: ${grantLib.explain(r.reason)}`); return 1; }
    console.log('▸ Grant revoked. It is refused on the next verification — there is no cached decision.');
    return 0;
  }

  if (sub === 'status' || sub === undefined) {
    const g = grantLib.load(active.root);
    if (!g) { console.log('No scope grant on this run.'); return 0; }
    console.log(`▸ Grant ${g.grant_id}${g.revoked ? '  [REVOKED]' : ''}`);
    console.log(`  Epic:      ${g.epic}`);
    console.log(`  Branches:  ${g.branches.join(', ')}`);
    console.log(`  Expires:   ${g.expires}`);
    console.log(`  Landings:  ${g.landings_remaining} remaining`);
    if (g.consumptions.length) {
      console.log('');
      console.log(`  Consumed (${g.consumptions.length}):`);
      for (const c of g.consumptions) console.log(`    - ${c.ts}  ${c.branch}  ${c.actor}`);
    }
    return 0;
  }

  // mint (default verb)
  const branchesArg = flag(args, '--branches');
  if (!branchesArg) {
    console.error('Error: momentum run grant --branches a,b [--hours N] [--landings N]');
    console.error('  A grant is a credential. It is scoped to one epic, expires, and is revocable.');
    return 1;
  }

  const hours = parseInt(flag(args, '--hours', '8'), 10);
  const epicSlug = flag(args, '--epic', active.m.tier === 'epic' ? active.m.target : null);
  if (!epicSlug) {
    console.error('Error: --epic required (this run is not epic-tier).');
    return 1;
  }

  const phaseCount = (epicLib.load(specsDir(), epicSlug) || { data: {} }).data.phases;
  const landings = parseInt(
    flag(args, '--landings', String((phaseCount && phaseCount.length) || 1)), 10);

  try {
    const g = grantLib.mint({
      repoRoot: active.root,
      epic: epicSlug,
      branches: branchesArg.split(',').map((s) => s.trim()).filter(Boolean),
      expiresIso: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
      landings,
      actor: gitEmail(active.root),
      nowIso: nowIso(),
    });
    console.log(`▸ Grant ${g.grant_id} minted for epic "${g.epic}"`);
    console.log(`  Branches:  ${g.branches.join(', ')}  (nothing else)`);
    console.log(`  Expires:   ${g.expires}`);
    console.log(`  Landings:  ${g.landings_remaining}`);
    console.log('');
    console.log('  This covers code you have not read yet. Revoke any time:');
    console.log('    momentum run grant revoke');
    return 0;
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Amendments (D11) — the operator pushing a change INTO a live run
// ─────────────────────────────────────────────────────────────────────────────

function cmdAmend(args) {
  const text = args[0];
  if (!text) {
    console.error('Error: momentum run amend "<change>" [--forward-only | --invalidates u1,u2]');
    console.error('  Without a signal the amendment is treated as invalidating — the safe');
    console.error('  direction, since silence would otherwise default to the cheap branch.');
    return 1;
  }
  const active = requireActiveRun();
  if (!active) return 1;

  const invArg = flag(args, '--invalidates');
  const res = amendLib.apply(active.root, {
    text,
    forwardOnly: args.includes('--forward-only'),
    invalidates: invArg ? invArg.split(',').map((s) => s.trim()).filter(Boolean) : [],
  }, nowIso());

  if (!res.ok) { console.error(`Error: ${res.message}`); return 1; }

  console.log(`▸ Amendment recorded — ${res.kind}`);
  console.log(`  ${res.message}`);
  if (res.stopped) {
    console.log('');
    console.log('  Affected completed work:');
    for (const u of res.invalidates) console.log(`    - ${u}`);
    console.log('');
    console.log('  Resume when you have decided what to do:  momentum run continue');
  }
  return res.stopped ? 0 : 0;
}

function cmdDerive(args) {
  const phase = args[0];
  const epicSlug = flag(args, '--epic');
  if (!phase || !epicSlug) {
    console.error('Error: momentum run derive <phase-dir> --epic <slug> [--deps a,b] [--write]');
    return 1;
  }

  const loaded = epicLib.load(specsDir(), epicSlug);
  if (!loaded) { console.error(`Error: no epic "${epicSlug}"`); return 1; }

  const manifest = manifestLib.loadSafe(repoRoot());
  const depsArg = flag(args, '--deps');
  const out = deriveLib.derive({
    epic: loaded.data,
    epicSlug,
    phase,
    deps: depsArg ? depsArg.split(',').map((s) => s.trim()).filter(Boolean) : [],
    decisions: [],
    amendments: amendLib.forwardAmendments(manifest),
    deferred: [],
    date: flag(args, '--date', nowIso().slice(0, 10)),
  });

  if (!args.includes('--write')) {
    process.stdout.write(out.overview);
    console.log('\n---\n(dry run — pass --write to create the phase directory)');
    return 0;
  }

  const dir = path.join(specsDir(), 'phases', phase);
  if (fs.existsSync(dir)) { console.error(`Error: ${dir} already exists`); return 1; }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'overview.md'), out.overview, 'utf8');
  fs.writeFileSync(path.join(dir, 'plan.md'), out.plan, 'utf8');
  fs.writeFileSync(path.join(dir, 'tasks.md'), out.tasks, 'utf8');
  fs.writeFileSync(path.join(dir, 'history.md'),
    `---\ntype: History\nstatus: in-progress\nepic: ${epicSlug}\n---\n\n# ${phase} — History\n`, 'utf8');

  console.log(`▸ Derived ${phase} from epic ${epicSlug} — no interview.`);
  console.log(`  ${path.relative(repoRoot(), dir)}/{overview,plan,tasks,history}.md`);
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
    case 'advance': return cmdAdvance(rest);
    case 'decide': return cmdDecide(rest);
    case 'park': return cmdPark(rest);
    case 'resolve': return cmdResolve(rest);
    case 'strike': return cmdStrike(rest);
    case 'clear-strikes': return cmdClearStrikes(rest);
    case 'grant': return cmdGrant(rest);
    case 'amend': return cmdAmend(rest);
    case 'derive': return cmdDerive(rest);
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

// ─────────────────────────────────────────────────────────────────────────────
// `momentum epic` — the multi-phase tier (Phase 32b)
// ─────────────────────────────────────────────────────────────────────────────

const epicLib = require(path.join(MOMENTUM_ROOT, 'core', 'run', 'lib', 'epic'));

const EPIC_USAGE = `momentum epic — one repo's multi-phase unit (Phase 32b, Epic 0001)

Usage:
  momentum epic create <slug> [--why "<objective>"] [--owner <name>]
                              [--phases a,b,c] [--release per-phase|per-feature]
  momentum epic list
  momentum epic status <slug>          Record + computed wave plan
  momentum epic close <slug>           Mark complete

An epic groups several phases in ONE repo. Cross-repo work is an initiative
(momentum ecosystem initiative) — the tier above.
`;

function specsDir() {
  return path.join(repoRoot(), 'specs');
}

function cmdEpicCreate(args) {
  const slug = args[0];
  if (!slug) { console.error('Error: momentum epic create <slug>'); return 1; }

  const phasesArg = flag(args, '--phases');
  try {
    const r = epicLib.create({
      specsDir: specsDir(),
      slug,
      objective: flag(args, '--why', ''),
      owner: flag(args, '--owner', ''),
      phases: phasesArg ? phasesArg.split(',').map((s) => s.trim()).filter(Boolean) : [],
      policy: { release: flag(args, '--release', 'per-phase') },
      nowIso: nowIso(),
    });
    console.log(`▸ Created epic ${r.id}-${r.slug}`);
    console.log(`  ${path.relative(repoRoot(), r.filePath)}`);
    console.log('');
    console.log('  Decisions settled here are never re-asked — per-phase specs derive from them.');
    return 0;
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }
}

function cmdEpicList() {
  const all = epicLib.list(specsDir());
  if (all.length === 0) { console.log('No epics.'); return 0; }
  for (const e of all) {
    console.log(`${e.id}  ${e.slug}  ${e.status}  (${e.phases.length} phases)`);
  }
  return 0;
}

function cmdEpicStatus(args) {
  const slug = args[0];
  if (!slug) { console.error('Error: momentum epic status <slug>'); return 1; }

  const loaded = epicLib.load(specsDir(), slug);
  if (!loaded) {
    console.error(`Error: no epic "${slug}" (or its frontmatter is outside the OKF subset).`);
    return 1;
  }

  const d = loaded.data;
  console.log(`▸ Epic ${d.id} — ${d.slug}  [${d.status}]`);
  console.log(`  Policy: release=${d.policy_release} push=${d.policy_push} tdd=${d.policy_tdd}`);
  console.log('');

  const g = epicLib.waves(specsDir(), slug);
  if (g.complete.length) console.log(`  Complete: ${g.complete.join(', ')}`);
  for (const w of g.waves) {
    console.log(`  Wave ${w.index}: ${w.nodes.join(', ')}`);
  }
  if (g.unscaffolded.length) {
    console.log('');
    console.log(`  Not yet scaffolded (${g.unscaffolded.length}) — no overview.md, so no deps to order by:`);
    for (const p of g.unscaffolded) console.log(`    - ${p}`);
    console.log('  Their specs derive when their turn comes (D10).');
  }
  return 0;
}

function cmdEpicClose(args) {
  const slug = args[0];
  if (!slug) { console.error('Error: momentum epic close <slug>'); return 1; }
  try {
    epicLib.setStatus(specsDir(), slug, 'complete', nowIso());
    console.log(`▸ Epic ${slug} marked complete.`);
    return 0;
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }
}

function runEpic(args) {
  switch (args[0]) {
    case 'create': return cmdEpicCreate(args.slice(1));
    case 'list': return cmdEpicList(args.slice(1));
    case 'status': return cmdEpicStatus(args.slice(1));
    case 'close': return cmdEpicClose(args.slice(1));
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      process.stdout.write(EPIC_USAGE);
      return 0;
    default:
      console.error(`Unknown subcommand: ${args[0]}\n`);
      process.stdout.write(EPIC_USAGE);
      return 1;
  }
}

module.exports = { runRun, runEpic, USAGE, EPIC_USAGE };
