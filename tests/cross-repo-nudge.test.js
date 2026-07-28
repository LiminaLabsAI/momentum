'use strict';

// Phase 31b G2 — cross-repo detection + routing nudge (ADR-0017 E1).
//
// Two layers, deliberately different in strength:
//   - post-commit banner: git-native, AGENT-INDEPENDENT, fires for humans and
//     scripts too, never blocks
//   - cross-repo-gate.sh: PreToolUse, fires BEFORE the edit, always exits 0
//
// AC-4 is the headline: the nudge must name the target member's open P0/P1,
// so it reads "frontend has BUG-001 open on the cost formatter" rather than
// "this is cross-repo work". That specific miss is why this exists.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const { mktmp, rmrf, runCli, write } = require('./_helpers');
const crossRepo = require('../core/ecosystem/lib/cross-repo');
const detect = require('../core/ecosystem/lib/detect');
const events = require('../core/ecosystem/lib/events');
const fragments = require('../core/team/lib/fragments');

// Phase 32d G2 additions. REPO_ROOT is already declared above.
const manifestLib = require('../core/run/lib/manifest');
const CLI = path.join(__dirname, '..', 'bin', 'momentum.js');

const REPO_ROOT = path.resolve(__dirname, '..');
const GATE = path.join(REPO_ROOT, 'core', 'scripts', 'cross-repo-gate.sh');
const NOW = '2026-07-27T12:00:00.000Z';

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@x',
  GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@x',
};
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', env: GIT_ENV }).trim();

const BACKLOG = `| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| BUG-001 | Cost formatter shows "Not specified" for sub-cent values | P1 | open | phase-4 | d |
`;

function setup({ withBacklog = true } = {}) {
  const tmp = mktmp();
  assert.equal(runCli(['ecosystem', 'init', 'eco'], { cwd: tmp }).status, 0);
  const root = path.join(tmp, 'eco');
  for (const id of ['backend', 'frontend']) {
    const dir = path.join(tmp, id);
    fs.mkdirSync(path.join(dir, 'specs', 'backlog'), { recursive: true });
    write(path.join(dir, 'CLAUDE.md'), `# ${id}\n`);
    write(path.join(dir, 'specs', 'status.md'), 'x\n');
    if (withBacklog && id === 'frontend') {
      write(path.join(dir, 'specs', 'backlog', 'backlog.md'), BACKLOG);
    }
    runCli(['ecosystem', 'add', `../${id}`, '--role', 'platform', '--id', id], { cwd: root });
  }
  return { tmp, root };
}

let seq = 0;
const event = (root, member, ts = NOW) => fragments.writeFragment(
  root, events.EVENTS_VIEW, 'ada', 'commit',
  { member, summary: `work in ${member}`, context: 'abc' }, { ts, seq: ++seq });

function runGate(payload) {
  return spawnSync('bash', [GATE], {
    input: JSON.stringify(payload), encoding: 'utf8', timeout: 15000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the nudge is actionable, not merely correct
// ─────────────────────────────────────────────────────────────────────────────

test('AC-4: the nudge names the target member open P0/P1 by id and title', () => {
  const { tmp, root } = setup();
  try {
    event(root, 'backend');
    const result = crossRepo.detect(root, { extra: ['frontend'], now: NOW });
    assert.equal(result.shouldRoute, true);

    const msg = crossRepo.routingMessage(root, result, 'frontend').join('\n');
    assert.match(msg, /Cross-repo work with no initiative: backend \+ frontend/);
    assert.match(msg, /BUG-001/, 'the specific open bug must be surfaced');
    assert.match(msg, /Cost formatter/);
    assert.match(msg, /\/brainstorm-initiative/, 'and it must say what to do');
  } finally { rmrf(tmp); }
});

test('the nudge degrades to a detail-free message when orient is unavailable', () => {
  const { tmp, root } = setup({ withBacklog: false });
  try {
    event(root, 'backend');
    const result = crossRepo.detect(root, { extra: ['frontend'], now: NOW });
    const msg = crossRepo.routingMessage(root, result, 'frontend').join('\n');
    // Still routes; just without member detail. Detail is a bonus, not a
    // precondition — a missing backlog must not silence the nudge.
    assert.match(msg, /Cross-repo work with no initiative/);
    assert.match(msg, /\/brainstorm-initiative/);
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Parity with detect.js (the shipped-runtime duplication fence)
// ─────────────────────────────────────────────────────────────────────────────

// REMOVED in Phase 31c G2 (ADR-0018 R7): "parity: cross-repo.js agrees with
// detect.js on every coverage case".
//
// That fence guarded a hand-written MIRROR of detect.js. cross-repo.js now
// DELEGATES to detect.js, so the two cannot disagree — there is one
// implementation. Keeping the fence would imply a duplicate still exists.

// REMOVED in Phase 31c G2 (ADR-0018 R1): "cross-repo.js stays dependency-free".
//
// Being dependency-free was the CONSTRAINT that forced the mirror, and the
// mirror is what produced BUG-029. cross-repo.js now requires core through the
// vendored runtime; asserting the old constraint would re-impose the cause.

// ─────────────────────────────────────────────────────────────────────────────
// The PreToolUse gate script
// ─────────────────────────────────────────────────────────────────────────────

test('gate nudges on entering a second member, then stays quiet in that session', () => {
  const { tmp, root } = setup();
  try {
    event(root, 'backend');
    const payload = {
      session_id: 'sess-1',
      tool_name: 'Write',
      tool_input: { file_path: path.join(tmp, 'frontend', 'src', 'cost.js') },
    };

    const first = runGate(payload);
    assert.equal(first.status, 0, 'the gate is ADVICE — it must never exit non-zero');
    assert.match(first.stderr, /Cross-repo work with no initiative/);
    assert.match(first.stderr, /BUG-001/);

    // Nudge fatigue is how a prompt becomes noise the agent learns to skip.
    const second = runGate(payload);
    assert.equal(second.status, 0);
    assert.equal(second.stderr.trim(), '', 'same session + member must nudge once');

    // A different session nudges again.
    const other = runGate({ ...payload, session_id: 'sess-2' });
    assert.match(other.stderr, /Cross-repo work with no initiative/);
  } finally { rmrf(tmp); }
});

test('gate is silent when an initiative covers the work', () => {
  const { tmp, root } = setup();
  try {
    event(root, 'backend');
    const initLib = require('../core/ecosystem/lib/initiative');
    fs.mkdirSync(path.join(root, 'initiatives'), { recursive: true });
    initLib.writeInitiative(path.join(root, 'initiatives', '0001-attachments.md'), {
      id: 1, slug: 'attachments', status: 'in-progress', started: '2026-07-20',
      owner: 'ada', repos: ['backend', 'frontend'],
    }, '# x\n');

    const res = runGate({
      session_id: 's', tool_name: 'Write',
      tool_input: { file_path: path.join(tmp, 'frontend', 'src', 'cost.js') },
    });
    assert.equal(res.status, 0);
    assert.equal(res.stderr.trim(), '', 'covered work must not be nudged');
  } finally { rmrf(tmp); }
});

test('gate is silent outside an ecosystem, and on unparseable input', () => {
  const tmp = mktmp();
  try {
    const solo = runGate({
      tool_name: 'Write', tool_input: { file_path: path.join(tmp, 'solo', 'x.js') },
    });
    assert.equal(solo.status, 0);
    assert.equal(solo.stderr.trim(), '');

    const junk = spawnSync('bash', [GATE], { input: 'not json', encoding: 'utf8', timeout: 15000 });
    assert.equal(junk.status, 0);
    assert.equal(junk.stderr.trim(), '');

    const empty = spawnSync('bash', [GATE], { input: '', encoding: 'utf8', timeout: 15000 });
    assert.equal(empty.status, 0);
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the agent-independent layer
// ─────────────────────────────────────────────────────────────────────────────

test('AC-2: a plain `git commit` surfaces the banner with no agent involved', () => {
  const tmp = mktmp();
  try {
    assert.equal(runCli(['ecosystem', 'init', 'eco'], { cwd: tmp }).status, 0);
    const root = path.join(tmp, 'eco');

    const dirs = {};
    for (const id of ['backend', 'frontend']) {
      const dir = path.join(tmp, id);
      fs.mkdirSync(dir, { recursive: true });
      git(dir, 'init', '-q');
      git(dir, 'config', 'user.email', 't@x');
      git(dir, 'config', 'user.name', 'T');
      assert.equal(runCli(['init', '.', '--agent', 'claude-code'], { cwd: dir }).status, 0);
      runCli(['ecosystem', 'add', `../${id}`, '--role', 'platform', '--id', id], { cwd: root });
      dirs[id] = dir;
    }
    write(path.join(dirs.frontend, 'specs', 'backlog', 'backlog.md'), BACKLOG);

    // Work in backend, then in frontend — no agent, no hook invoked by hand.
    write(path.join(dirs.backend, 'a.txt'), 'x\n');
    git(dirs.backend, 'add', 'a.txt');
    git(dirs.backend, 'commit', '-qm', 'feat: backend');

    write(path.join(dirs.frontend, 'b.txt'), 'y\n');
    git(dirs.frontend, 'add', 'b.txt');
    const res = spawnSync('git', ['commit', '-m', 'feat: frontend'],
      { cwd: dirs.frontend, encoding: 'utf8', env: GIT_ENV });

    assert.equal(res.status, 0, 'the banner must never block a commit');
    assert.match(res.stderr, /Cross-repo work with no initiative/,
      'the git-native layer fires regardless of which agent (if any) is driving');
    assert.match(res.stderr, /BUG-001/);
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Adapter wiring
// ─────────────────────────────────────────────────────────────────────────────

test('every adapter registers the nudge on a write-class matcher', () => {
  const cc = JSON.parse(fs.readFileSync(
    path.join(REPO_ROOT, 'adapters/claude-code/settings.json'), 'utf8'));
  const ccEntry = cc.hooks.PreToolUse.find((e) => (e.hooks || [])
    .some((h) => String(h.command).includes('cross-repo-gate.sh')));
  assert.ok(ccEntry, 'claude-code must register cross-repo-gate.sh');
  assert.ok(new RegExp(`^(?:${ccEntry.matcher})$`).test('Write'));

  const cx = JSON.parse(fs.readFileSync(
    path.join(REPO_ROOT, 'adapters/codex/hooks.json'), 'utf8'));
  const cxEntry = cx.hooks.PreToolUse.find((e) => (e.hooks || [])
    .some((h) => String(h.command).includes('cross-repo-gate.sh')));
  assert.ok(cxEntry, 'codex must register cross-repo-gate.sh');

  const ag = JSON.parse(fs.readFileSync(
    path.join(REPO_ROOT, 'adapters/antigravity/hooks.json'), 'utf8'));
  assert.ok(JSON.stringify(ag).includes('cross-repo-gate.sh'),
    'antigravity must route the nudge through its shim');

  const oc = fs.readFileSync(path.join(REPO_ROOT, '.opencode/plugins/momentum.js'), 'utf8');
  const before = oc.slice(oc.indexOf('"tool.execute.before"'), oc.indexOf('"tool.execute.after"'));
  assert.match(before, /cross-repo-gate\.sh/,
    'opencode has no matcher string — its plugin must dispatch the nudge in code');
});

test('the gate script never exits 2 — it is advice, not a block', () => {
  const src = fs.readFileSync(GATE, 'utf8');
  assert.doesNotMatch(src, /exit 2/,
    'ADR-0017 E1 puts the teeth on the git axis; blocking here would fake enforcement');
  assert.match(src, /exit 0/);
});

// ─────────────────────────────────────────────────────────────────────────────
// G4 — the rules must state enforcement strength precisely (ADR-0017 E7)
// ─────────────────────────────────────────────────────────────────────────────
//
// BUG-009 was filed because Rule 6's header said "(Automatic)" over prose no
// mechanism backed, and that overstatement shipped verbatim to every downstream
// install. 31a then deliberately understated ("convention, not enforcement").
// Both directions teach agents to distrust the text, so the distinction is now
// asserted rather than trusted to survive editing.

test('E7: instruction text distinguishes best-effort nudge from enforced gate', () => {
  for (const name of ['ecosystem-claude.md', 'ecosystem-agents.md']) {
    const body = fs.readFileSync(
      path.join(REPO_ROOT, 'core', 'ecosystem', 'templates', name), 'utf8');

    assert.match(body, /best-effort/i, `${name}: the nudge must be labelled best-effort`);
    assert.match(body, /unconditional/i, `${name}: the write path must be labelled unconditional`);
    assert.match(body, /enforced/i, `${name}: the landing gate must be labelled enforced`);

    // The 31a wording is now wrong in the other direction — detection exists.
    assert.doesNotMatch(body, /this routing is agent convention/i,
      `${name}: 31a's "convention, not enforcement" phrasing must not survive 31b`);
  }
});

test('E7: the member pointer states enforcement strength, not a blanket claim', () => {
  const pointer = require('../core/ecosystem/lib/pointer');
  const body = pointer.renderPointerBody('my-eco', '../eco');

  assert.match(body, /best-effort/i);
  assert.match(body, /refuses/i);
  assert.doesNotMatch(body, /routing is convention/i,
    'the pointer must not keep claiming nothing detects cross-repo scope');
});

test('E6: sync-docs delivers cross-repo entries instead of only mentioning them', () => {
  const body = fs.readFileSync(
    path.join(REPO_ROOT, 'core', 'commands', 'sync-docs.md'), 'utf8');

  // The ownership rule is unchanged and must stay absolute.
  assert.match(body, /NEVER edit a file in another repo|NEVER update files in another repo/);
  // …but the delivery mechanism is now the inbox, not a chat message.
  assert.match(body, /orchestration\.handoff\.handoff/);
  assert.match(body, /inbox/);
  assert.match(body, /Delivery is not ownership/);
  assert.doesNotMatch(body, /they're informational only/,
    'a chat message dies with the session — that was the whole failure');
});


// ═════════════════════════════════════════════════════════════════════════════
// Phase 32d G2 — BUG-032 (the halting wording) and the initiative tier.
//
// Appended to the existing suite above, which already covers the gate's
// once-per-member throttling and its advisory exit code. These add the two
// things 32d changes: the message no longer reads as an instruction, and an
// active run grant suppresses it entirely.
// ═════════════════════════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────────────────
// BUG-032 — the wording
// ─────────────────────────────────────────────────────────────────────────────

test('BUG-032: the nudge states a fact and does NOT instruct the agent to stop', () => {
  const lines = crossRepo.routingMessage('/tmp/nowhere', { members: ['a', 'b'] }, null);
  const text = lines.join('\n');

  // The exact phrase that caused the halt.
  assert.ok(!/before going further/i.test(text),
    'an imperative here reads as a stop instruction, whatever the exit code says');

  // It must still say the useful thing.
  assert.match(text, /Cross-repo work belongs to an initiative/);
  assert.match(text, /brainstorm-initiative/);

  // And say plainly that it is not a gate.
  assert.match(text, /a note, not a gate/);
  assert.match(text, /the current task continues/);
});

test('BUG-032: no imperative verb opens any nudge line', () => {
  // A softer regression guard than matching one phrase: the whole message must
  // stay observational, so a future edit cannot quietly reintroduce a command.
  const lines = crossRepo.routingMessage('/tmp/nowhere', { members: ['a', 'b'] }, null);
  for (const l of lines) {
    assert.ok(!/^\s*(→\s*)?(Run|Stop|Open|Do not|Don't)\b/.test(l),
      `nudge line reads as an instruction: ${JSON.stringify(l)}`);
  }
});

test('BUG-032: the gate script is still advisory — exit 0 on every path', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'core', 'scripts', 'cross-repo-gate.sh'), 'utf8');
  assert.match(src, /Exit codes: always 0/);
  assert.ok(!/exit 2/.test(src), 'this hook must never block a write');
});

test('BUG-032: an active run grant suppresses the nudge entirely', () => {
  // The grant IS the coordination record the nudge asks for. Telling an
  // operator to go open an initiative, when they have already approved a
  // scoped authorization naming these members, is asking for what they did.
  const src = fs.readFileSync(path.join(REPO_ROOT, 'core', 'scripts', 'cross-repo-gate.sh'), 'utf8');
  assert.match(src, /run\.json/);
  assert.match(src, /grant\.revoked !== true/);
  assert.match(src, /Date\.parse\(run\.grant\.expires\) > Date\.now\(\)/,
    'an EXPIRED grant must not suppress the nudge');
});

test('BUG-032: the installed mirror emits the same wording (ADR-0018)', () => {
  // Asserted on EMITTED OUTPUT, not raw source — the source legitimately
  // contains the old phrase inside the comment explaining why it was removed,
  // and a source-level regex would flag that forever.
  const mirror = require(path.join(REPO_ROOT, '.githooks', 'cross-repo.js'));
  const mirrorText = mirror.routingMessage('/tmp/nowhere', { members: ['a', 'b'] }, null).join('\n');
  const coreText = crossRepo.routingMessage('/tmp/nowhere', { members: ['a', 'b'] }, null).join('\n');

  assert.ok(!/before going further/i.test(mirrorText),
    'the shipped mirror must not emit the halting wording');
  assert.equal(mirrorText, coreText, 'core and its shipped mirror must emit identically');
});

// ─────────────────────────────────────────────────────────────────────────────
// Initiative tier — the fourth scale
// ─────────────────────────────────────────────────────────────────────────────

test('an initiative-tier run is accepted as a tier', () => {
  assert.ok(manifestLib.TIERS.includes('initiative'));
});

test('an initiative-tier run outside an ecosystem degrades audibly, not silently', () => {
  // Better a named degradation than a cursor silently pointing at the slug.
  const dir = mktmp();
  try {
    const r = spawnSync('node', [CLI, 'run', 'start', 'initiative', 'attachments'],
      { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const m = manifestLib.load(dir);
    assert.equal(m.tier, 'initiative');
    assert.equal(m.cursor.unit, 'attachments', 'falls back to the target');
  } finally { rmrf(dir); }
});

test('initiative ordering uses the SAME wave engine as every other tier', () => {
  // ADR-0003: one topological sort, four scales. If this ever imports a second
  // orderer, that is the thing the ADR exists to prevent.
  const src = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'run.js'), 'utf8');
  const initBlock = src.slice(src.indexOf("tier === 'initiative'"), src.indexOf("tier === 'epic'"));
  assert.match(initBlock, /computeWaveLayers/);
  assert.match(initBlock, /core', 'waves', 'lib', 'waves'/);
});

// ═════════════════════════════════════════════════════════════════════════════
// VAL-006 regression — initiative-tier resolution INSIDE a real ecosystem.
//
// The original 32d G2 test only covered degradation OUTSIDE an ecosystem, where
// it is loud. Run against the live cerebrio fleet the code failed three ways at
// once — wrong module (`loadInitiative` is in initiative.js, not index.js),
// wrong slug (files are `NNNN-<slug>`, the loader takes the bare slug), and it
// fell through SILENTLY because the wrong module was guarded with `&&` as
// though it were an optional feature. The cursor pointed at the initiative slug
// instead of a member, and nothing said so.
// ═════════════════════════════════════════════════════════════════════════════

test('VAL-006: initiative resolution uses the module that actually has loadInitiative', () => {
  const initiativeLib = require('../core/ecosystem/lib/initiative');
  const indexLib = require('../core/ecosystem/lib/index');
  assert.equal(typeof initiativeLib.loadInitiative, 'function');
  assert.equal(indexLib.loadInitiative, undefined,
    'if this ever moves to index.js, bin/run.js must move with it');

  const src = fs.readFileSync(path.join(__dirname, '..', 'bin', 'run.js'), 'utf8');
  const raw = src.slice(src.indexOf("tier === 'initiative'"), src.indexOf("tier === 'epic'"));
  // Strip // comments before asserting. The fix's own comment QUOTES the old
  // broken code to explain it, and a source-level regex would match the
  // explanation forever — the same trap the BUG-032 wording test hit.
  const block = raw.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

  assert.match(block, /lib', 'initiative'/, 'must require initiative.js');
  assert.ok(!/eco\.loadInitiative\s*&&/.test(block),
    'guarding a WRONG module with && turns a bug into a silent no-op');
});

test('VAL-006: an NNNN- prefixed target is normalised to the bare slug', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'bin', 'run.js'), 'utf8');
  const block = src.slice(src.indexOf("tier === 'initiative'"), src.indexOf("tier === 'epic'"));
  assert.match(block, /replace\(\/\^\\d\{4\}-\//,
    'initiative files are NNNN-<slug>.md; the loader takes the bare slug');
});

test('VAL-006: resolving no members is REPORTED, never a silent fall-through', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'bin', 'run.js'), 'utf8');
  const block = src.slice(src.indexOf("tier === 'initiative'"), src.indexOf("tier === 'epic'"));
  assert.match(block, /resolved no members/,
    'the silent fall-through is exactly what VAL-006 caught');
});
