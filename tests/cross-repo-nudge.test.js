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

test('parity: cross-repo.js agrees with detect.js on every coverage case', () => {
  const { tmp, root } = setup();
  try {
    const initLib = require('../core/ecosystem/lib/initiative');
    const cases = [
      { name: 'single member', members: ['backend'] },
      { name: 'two members uncovered', members: ['backend', 'frontend'] },
    ];
    for (const c of cases) {
      rmrf(path.join(root, '.momentum', 'team', events.EVENTS_VIEW));
      for (const m of c.members) event(root, m);
      const a = detect.detect(root, { now: NOW });
      const b = crossRepo.detect(root, { now: NOW });
      assert.equal(b.crossRepo, a.crossRepo, `${c.name}: crossRepo`);
      assert.equal(b.shouldRoute, a.shouldRoute, `${c.name}: shouldRoute`);
      assert.deepEqual(b.members, a.members, `${c.name}: members`);
    }

    // …and with an in-progress initiative covering both.
    fs.mkdirSync(path.join(root, 'initiatives'), { recursive: true });
    initLib.writeInitiative(path.join(root, 'initiatives', '0001-attachments.md'), {
      id: 1, slug: 'attachments', status: 'in-progress', started: '2026-07-20',
      owner: 'ada', repos: ['backend', 'frontend'],
    }, '# x\n');

    const a = detect.detect(root, { now: NOW });
    const b = crossRepo.detect(root, { now: NOW });
    assert.equal(b.covered, a.covered, 'covered');
    assert.equal(b.initiative, a.initiative, 'initiative slug');
    assert.equal(b.shouldRoute, false);
  } finally { rmrf(tmp); }
});

test('cross-repo.js stays dependency-free so it can ship with the hooks', () => {
  const src = fs.readFileSync(
    path.join(REPO_ROOT, 'core', 'ecosystem', 'lib', 'cross-repo.js'), 'utf8');
  const top = src.split('module.exports')[0];
  const requires = [...top.matchAll(/^const .* = require\(['"]([^'"]+)['"]\)/gm)].map((m) => m[1]);
  assert.deepEqual(requires.sort(), ['fs', 'path'],
    'top-level requires must be node builtins — orient is resolved lazily');
});

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
