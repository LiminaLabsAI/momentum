'use strict';

// Phase 31a G3 — `momentum ecosystem initiative complete` (ADR-0016).
//
// AC-3 is the headline: the gate must REFUSE when a member contribution lacks
// evidence, and say which member and why. Before 31a, cross-repo completion was
// done by hand per repo with no cross-repo gate at all — which is how two
// production defects reached users across the reviewed sessions while every
// individual repo's suite was green.
//
// The second theme is exit codes. A gate that prints REFUSED and exits 0 is not
// a gate: scripts and CI steps read the status, not the prose.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, write, read } = require('./_helpers');
const initLib = require('../core/ecosystem/lib/initiative');

/** Ecosystem + two members + an initiative already `start`ed. */
function setup({ config } = {}) {
  const tmp = mktmp();
  assert.equal(runCli(['ecosystem', 'init', 'eco'], { cwd: tmp }).status, 0);
  const root = path.join(tmp, 'eco');

  for (const [id, role] of [['backend', 'platform'], ['frontend', 'client']]) {
    const dir = path.join(tmp, id);
    fs.mkdirSync(path.join(dir, 'specs'), { recursive: true });
    write(path.join(dir, 'CLAUDE.md'), `# ${id}\n`);
    write(path.join(dir, 'specs', 'status.md'), 'x\n');
    runCli(['ecosystem', 'add', `../${id}`, '--role', role, '--id', id], { cwd: root });
  }

  runCli(['ecosystem', 'initiative', 'create', 'attachments',
    '--why', 'Users need attachments', '--repos', 'backend,frontend', '--owner', 'ada'],
  { cwd: root });

  runCli(['ecosystem', 'initiative', 'start', 'attachments',
    '--contribute', 'backend:phase:phase-12-attachments',
    '--contribute', 'frontend:adhoc:fix-BUG-031-upload'], { cwd: root });

  if (config) {
    const p = path.join(root, 'ecosystem.json');
    const m = JSON.parse(read(p));
    m.config = config;
    fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
  }
  return { tmp, root };
}

function giveBackendEvidence(tmp, { empty = false } = {}) {
  const dir = path.join(tmp, 'backend', 'specs', 'phases', 'phase-12-attachments');
  fs.mkdirSync(dir, { recursive: true });
  write(path.join(dir, 'retrospective.md'),
    empty
      ? '# Retro\n\n## Verification Evidence\n\n## Something else\n'
      : '# Retro\n\n## Verification Evidence\n\n`npm test` 412/412 green.\n');
}

function giveFrontendEvidence(tmp) {
  const dir = path.join(tmp, 'frontend', 'specs', 'adhoc', 'fix-BUG-031-upload');
  fs.mkdirSync(dir, { recursive: true });
  write(path.join(dir, 'record.md'), '# fix-BUG-031\nVerified: suite green.\n');
}

const complete = (root, args = []) =>
  runCli(['ecosystem', 'initiative', 'complete', 'attachments', ...args], { cwd: root });

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — refusal
// ─────────────────────────────────────────────────────────────────────────────

test('AC-3: refuses when member evidence is missing, naming member and reason', () => {
  const { tmp, root } = setup();
  try {
    const res = complete(root);
    const out = res.stdout + res.stderr;

    assert.notEqual(res.status, 0, 'a refusing gate MUST exit non-zero');
    assert.match(out, /REFUSED/);
    assert.match(out, /backend.*missing retrospective/s);
    assert.match(out, /frontend.*missing ad-hoc record/s);

    // And it must NOT have closed anything.
    assert.equal(initLib.loadInitiative(root, 'attachments').frontmatter.status, 'in-progress');
  } finally { rmrf(tmp); }
});

test('refuses when a retrospective exists but Verification Evidence is empty', () => {
  const { tmp, root } = setup();
  try {
    giveBackendEvidence(tmp, { empty: true });
    giveFrontendEvidence(tmp);

    const res = complete(root);
    assert.notEqual(res.status, 0);
    assert.match(res.stdout + res.stderr, /"## Verification Evidence" is missing or empty/);
  } finally { rmrf(tmp); }
});

test('refuses an initiative with no declared contributions', () => {
  const tmp = mktmp();
  try {
    assert.equal(runCli(['ecosystem', 'init', 'eco'], { cwd: tmp }).status, 0);
    const root = path.join(tmp, 'eco');
    const dir = path.join(tmp, 'backend');
    fs.mkdirSync(path.join(dir, 'specs'), { recursive: true });
    write(path.join(dir, 'CLAUDE.md'), '# backend\n');
    write(path.join(dir, 'specs', 'status.md'), 'x\n');
    runCli(['ecosystem', 'add', '../backend', '--role', 'platform', '--id', 'backend'], { cwd: root });
    runCli(['ecosystem', 'initiative', 'create', 'bare',
      '--why', 'w', '--repos', 'backend', '--owner', 'ada'], { cwd: root });

    // Closing an initiative with nothing linked would record "verified" for
    // work that was never tied to any record.
    const res = runCli(['ecosystem', 'initiative', 'complete', 'bare'], { cwd: root });
    assert.notEqual(res.status, 0);
    assert.match(res.stdout + res.stderr, /no contributions declared/);
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration verification (ADR-0016 D6)
// ─────────────────────────────────────────────────────────────────────────────

test('an UNDECLARED integration verify is reported as a gap, not a silent pass', () => {
  const { tmp, root } = setup();
  try {
    giveBackendEvidence(tmp);
    giveFrontendEvidence(tmp);

    const res = complete(root, ['--dry-run']);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /NOT DECLARED/);
    assert.match(res.stdout, /work TOGETHER/);
    assert.match(res.stdout, /integration_verify_command/);
  } finally { rmrf(tmp); }
});

test('a DECLARED integration verify that fails blocks the close', () => {
  const { tmp, root } = setup({
    config: { integration_verify_command: 'echo "contract drift detected"; exit 1' },
  });
  try {
    giveBackendEvidence(tmp);
    giveFrontendEvidence(tmp);

    const res = complete(root);
    const out = res.stdout + res.stderr;
    assert.notEqual(res.status, 0);
    assert.match(out, /REFUSED/);
    assert.match(out, /integration verify failed/);
    assert.match(out, /contract drift detected/, 'failing output must be shown');
    assert.equal(initLib.loadInitiative(root, 'attachments').frontmatter.status, 'in-progress');
  } finally { rmrf(tmp); }
});

test('--skip-verify does not buy a pass on a declared check', () => {
  const { tmp, root } = setup({ config: { integration_verify_command: 'exit 0' } });
  try {
    giveBackendEvidence(tmp);
    giveFrontendEvidence(tmp);

    const res = complete(root, ['--skip-verify']);
    assert.notEqual(res.status, 0, 'skipping a declared gate must not close the initiative');
    assert.match(res.stdout + res.stderr, /SKIPPED/);
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Pass path
// ─────────────────────────────────────────────────────────────────────────────

test('closes when all evidence is present and the declared verify passes', () => {
  const { tmp, root } = setup({ config: { integration_verify_command: 'echo integration ok' } });
  try {
    giveBackendEvidence(tmp);
    giveFrontendEvidence(tmp);

    const res = complete(root);
    assert.equal(res.status, 0, res.stderr || res.stdout);

    const loaded = initLib.loadInitiative(root, 'attachments');
    assert.equal(loaded.frontmatter.status, 'closed');
    assert.match(loaded.frontmatter.closed, /^\d{4}-\d{2}-\d{2}$/);

    // Close section is populated with the actual evidence (TD-011).
    assert.match(loaded.content, /## Close/);
    assert.match(loaded.content, /Evidence at close/);
    assert.match(loaded.content, /\*\*backend\*\* \(phase:`phase-12-attachments`\)/);
    assert.match(loaded.content, /Integration verification: passed/);
    // Deploy chronology gets a generated block rather than staying template prose.
    assert.match(loaded.content, /momentum:chronology/);

    // Active initiative cleared.
    const teamState = require('../core/ecosystem/lib/team-state');
    const active = teamState.getActiveInitiative(root);
    assert.ok(!active || !active.slug, 'active initiative must be cleared on close');
  } finally { rmrf(tmp); }
});

test('--dry-run writes nothing', () => {
  const { tmp, root } = setup();
  try {
    giveBackendEvidence(tmp);
    giveFrontendEvidence(tmp);

    const before = read(initLib.loadInitiative(root, 'attachments').filePath);
    assert.equal(complete(root, ['--dry-run']).status, 0);
    const after = read(initLib.loadInitiative(root, 'attachments').filePath);
    assert.equal(after, before, '--dry-run must not modify the initiative');
  } finally { rmrf(tmp); }
});

test('refuses to re-close an already-closed initiative', () => {
  const { tmp, root } = setup({ config: { integration_verify_command: 'exit 0' } });
  try {
    giveBackendEvidence(tmp);
    giveFrontendEvidence(tmp);
    assert.equal(complete(root).status, 0);

    const again = complete(root);
    assert.notEqual(again.status, 0);
    assert.match(again.stdout + again.stderr, /already closed/);
  } finally { rmrf(tmp); }
});

test('a member with no local checkout blocks rather than being skipped', () => {
  const { tmp, root } = setup();
  try {
    giveBackendEvidence(tmp);
    giveFrontendEvidence(tmp);
    // Simulate a teammate's machine: frontend is registered but not cloned here.
    rmrf(path.join(tmp, 'frontend'));

    const res = complete(root);
    assert.notEqual(res.status, 0, 'an unverifiable member must not pass silently');
    assert.match(res.stdout + res.stderr, /frontend/);
    assert.match(res.stdout + res.stderr, /cannot be verified|missing on disk/);
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Shared grading with `lanes land`
// ─────────────────────────────────────────────────────────────────────────────

test('the ecosystem gate grades evidence with the SAME parser as `lanes land`', () => {
  // Two graders that drift would let work pass one gate and fail the other —
  // the bug class this phase exists to close. So the ecosystem gate imports
  // land.js's parser rather than reimplementing the section match.
  const land = require('../core/lanes/lib/land');
  const complete = require('../core/ecosystem/lib/complete');

  assert.equal(typeof land.evidenceSection, 'function',
    'land.js must export evidenceSection for the ecosystem gate to reuse');

  const withEvidence = '# R\n\n## Verification Evidence\n\nsuite green\n';
  const withoutEvidence = '# R\n\n## Verification Evidence\n\n## Next\n';
  assert.ok(land.evidenceSection(withEvidence));
  assert.equal(land.evidenceSection(withoutEvidence), null);

  const src = fs.readFileSync(
    path.join(__dirname, '..', 'core', 'ecosystem', 'lib', 'complete.js'), 'utf8');
  assert.match(src, /require\(['"]\.\.\/\.\.\/lanes\/lib\/land['"]\)/,
    'complete.js must reuse land.js rather than reimplementing evidence grading');
  assert.equal(typeof complete.evaluate, 'function');
});

// ─────────────────────────────────────────────────────────────────────────────
// G4 — record writers (TD-011: three template sections that had no writer)
// ─────────────────────────────────────────────────────────────────────────────

test('linked-decisions writer picks up stamped member ADRs and ignores others', () => {
  const { tmp, root } = setup({ config: { integration_verify_command: 'exit 0' } });
  try {
    giveBackendEvidence(tmp);
    giveFrontendEvidence(tmp);

    const decisions = path.join(tmp, 'backend', 'specs', 'decisions');
    fs.mkdirSync(decisions, { recursive: true });
    // Stamped — must be linked.
    write(path.join(decisions, '0007-object-storage.md'),
      '---\ntype: ADR\ninitiative: attachments\n---\n\n# ADR-0007: Object storage\n');
    // Unstamped — must NOT be linked.
    write(path.join(decisions, '0008-unrelated.md'),
      '---\ntype: ADR\n---\n\n# ADR-0008: Something else\n');
    // Stamped for a DIFFERENT initiative — must NOT be linked.
    write(path.join(decisions, '0009-other-initiative.md'),
      '---\ntype: ADR\ninitiative: telemetry\n---\n\n# ADR-0009: Telemetry\n');

    assert.equal(complete(root).status, 0);

    const body = initLib.loadInitiative(root, 'attachments').content;
    assert.match(body, /ADR-0007: Object storage/);
    assert.doesNotMatch(body, /ADR-0008/);
    assert.doesNotMatch(body, /ADR-0009/);
    assert.match(body, /momentum:decisions/);
  } finally { rmrf(tmp); }
});

test('linked-decisions section explains the stamp when nothing is linked', () => {
  const { tmp, root } = setup({ config: { integration_verify_command: 'exit 0' } });
  try {
    giveBackendEvidence(tmp);
    giveFrontendEvidence(tmp);
    assert.equal(complete(root).status, 0);

    const body = initLib.loadInitiative(root, 'attachments').content;
    // An empty section must say HOW to populate it, not just sit blank —
    // blank is how it stayed dead in the template for four phases (TD-011).
    assert.match(body, /add that stamp to a decision/);
  } finally { rmrf(tmp); }
});

test('chronology renders recorded tag/merge events for contributing members', () => {
  const { tmp, root } = setup({ config: { integration_verify_command: 'exit 0' } });
  try {
    giveBackendEvidence(tmp);
    giveFrontendEvidence(tmp);

    const fragments = require('../core/team/lib/fragments');
    const events = require('../core/ecosystem/lib/events');
    fragments.writeFragment(root, events.EVENTS_VIEW, 'ada', 'tag',
      { member: 'backend', summary: 'release v2.1.0', context: 'v2.1.0' },
      { ts: '2026-07-27T14:30:00.000Z', seq: 1 });
    // An event for a member NOT in this initiative must be excluded.
    fragments.writeFragment(root, events.EVENTS_VIEW, 'ada', 'tag',
      { member: 'stranger', summary: 'release v9', context: 'v9' },
      { ts: '2026-07-27T15:00:00.000Z', seq: 2 });

    assert.equal(complete(root).status, 0);

    const body = initLib.loadInitiative(root, 'attachments').content;
    assert.match(body, /2026-07-27 14:30Z.*backend.*v2\.1\.0.*release v2\.1\.0/);
    assert.doesNotMatch(body, /stranger/);
  } finally { rmrf(tmp); }
});
