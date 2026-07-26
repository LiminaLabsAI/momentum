'use strict';

// Phase 31a G2 — `momentum ecosystem initiative start` (ADR-0016).
//
// The missing middle of the spine. Before 31a you could `create` an initiative,
// and a full `/swarm` was wired end-to-end, but nothing connected the two and
// nothing wrote results back:
//
//   - `ecosystem.json` dependencies[] had NO writer at all (initialized empty,
//     pruned on remove). A dep graph that gained a real edge during cross-repo
//     work silently became a lie.
//   - `## Per-repo contributions` shipped in the template since Phase 9 with
//     zero code writing it (TD-011).
//
// `start` is deliberately a DECLARATION, not a cross-repo scaffold: each member
// owns its own specs/, so its own /start-phase or /hotfix creates the record.
// Reaching across that boundary would contradict the rule /sync-docs enforces.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, write, read } = require('./_helpers');

const initLib = require('../core/ecosystem/lib/initiative');

/** Ecosystem with backend + frontend members and one open initiative. */
function setup() {
  const tmp = mktmp();
  assert.equal(runCli(['ecosystem', 'init', 'eco'], { cwd: tmp }).status, 0);
  const root = path.join(tmp, 'eco');

  for (const [id, role] of [['backend', 'platform'], ['frontend', 'client']]) {
    const dir = path.join(tmp, id);
    fs.mkdirSync(path.join(dir, 'specs'), { recursive: true });
    write(path.join(dir, 'CLAUDE.md'), `# ${id}\n`);
    write(path.join(dir, 'specs', 'status.md'), 'x\n');
    const add = runCli(['ecosystem', 'add', `../${id}`, '--role', role, '--id', id], { cwd: root });
    assert.equal(add.status, 0, add.stderr || add.stdout);
  }

  const create = runCli([
    'ecosystem', 'initiative', 'create', 'attachments',
    '--why', 'Users need attachments', '--repos', 'backend,frontend', '--owner', 'ada',
  ], { cwd: root });
  assert.equal(create.status, 0, create.stderr || create.stdout);

  return { tmp, root };
}

function manifestOf(root) {
  return JSON.parse(read(path.join(root, 'ecosystem.json')));
}

function initiativeOf(root) {
  return initLib.loadInitiative(root, 'attachments');
}

function start(root, args) {
  return runCli(['ecosystem', 'initiative', 'start', 'attachments', ...args], { cwd: root });
}

test('start declares contributions and registers dependency edges', () => {
  const { tmp, root } = setup();
  try {
    const res = start(root, [
      '--contribute', 'backend:phase:phase-12-attachments',
      '--contribute', 'frontend:adhoc:fix-BUG-031-upload',
      '--edge', 'frontend:backend:api-contract',
    ]);
    assert.equal(res.status, 0, res.stderr || res.stdout);

    const fm = initiativeOf(root).frontmatter;
    assert.deepEqual(fm.contributions, [
      'backend:phase:phase-12-attachments',
      'frontend:adhoc:fix-BUG-031-upload',
    ]);

    // The first code in momentum's history to write a dependency edge.
    const deps = manifestOf(root).dependencies;
    assert.equal(deps.length, 1);
    assert.deepEqual(deps[0], {
      from: 'frontend', to: 'backend', kind: 'api-contract', initiative: 'attachments',
    });
  } finally { rmrf(tmp); }
});

test('start populates the Per-repo contributions section (TD-011)', () => {
  const { tmp, root } = setup();
  try {
    start(root, [
      '--contribute', 'backend:phase:phase-12-attachments',
      '--contribute', 'frontend:adhoc:fix-BUG-031-upload',
    ]);
    const body = initiativeOf(root).content;

    assert.match(body, /## Per-repo contributions/);
    assert.match(body, /\| backend \| phase \| `phase-12-attachments` \|/);
    assert.match(body, /\| frontend \| adhoc \| `fix-BUG-031-upload` \|/);
    // The section must say why no status is cached there.
    assert.match(body, /resolves it live/);
  } finally { rmrf(tmp); }
});

test('start leaves every other body section byte-untouched', () => {
  const { tmp, root } = setup();
  try {
    const before = initiativeOf(root).content;
    const sectionsBefore = before.split(/\n(?=## )/).filter((s) => !s.startsWith('## Per-repo'));

    start(root, ['--contribute', 'backend:phase:phase-12-attachments']);

    const after = initiativeOf(root).content;
    const sectionsAfter = after.split(/\n(?=## )/).filter((s) => !s.startsWith('## Per-repo'));
    assert.deepEqual(sectionsAfter, sectionsBefore,
      'only the generated section may change — body sections are human writing');
  } finally { rmrf(tmp); }
});

test('start is idempotent — re-running adds no duplicates', () => {
  const { tmp, root } = setup();
  try {
    const args = [
      '--contribute', 'backend:phase:phase-12-attachments',
      '--edge', 'frontend:backend:api-contract',
    ];
    assert.equal(start(root, args).status, 0);
    assert.equal(start(root, args).status, 0);

    assert.equal(initiativeOf(root).frontmatter.contributions.length, 1);
    assert.equal(manifestOf(root).dependencies.length, 1);

    // And the generated section must not accumulate duplicate tables.
    const body = initiativeOf(root).content;
    assert.equal((body.match(/momentum:contributions/g) || []).length, 1);
  } finally { rmrf(tmp); }
});

test('start refuses to silently repoint an existing contribution', () => {
  const { tmp, root } = setup();
  try {
    assert.equal(start(root, ['--contribute', 'backend:phase:phase-12-attachments']).status, 0);

    // Silently repointing would orphan the evidence trail the completion gate
    // depends on — so it must refuse, like `initiative create` already does.
    const res = start(root, ['--contribute', 'backend:phase:phase-99-something-else']);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr + res.stdout, /already contributes/);

    assert.deepEqual(initiativeOf(root).frontmatter.contributions,
      ['backend:phase:phase-12-attachments']);
  } finally { rmrf(tmp); }
});

test('start rejects unknown members, non-participating members, and bad edges', () => {
  const { tmp, root } = setup();
  try {
    const cases = [
      [['--contribute', 'ghost:phase:x'], /unknown member/],
      [['--contribute', 'backend:release:x'], /malformed --contribute/],
      [['--edge', 'frontend-backend'], /malformed --edge/],
      [['--edge', 'frontend:backend:nonsense'], /edge kind/],
      [['--edge', 'backend:backend:deploy'], /self-referential/],
      [['--edge', 'ghost:backend:deploy'], /unknown member/],
    ];
    for (const [args, pattern] of cases) {
      const res = start(root, args);
      assert.notEqual(res.status, 0, `expected failure for ${args.join(' ')}`);
      assert.match(res.stderr + res.stdout, pattern);
    }
    // Nothing partial may have been written.
    assert.equal((manifestOf(root).dependencies || []).length, 0);
  } finally { rmrf(tmp); }
});

test('start rejects a member that is not among the initiative repos', () => {
  const { tmp, root } = setup();
  try {
    const dir = path.join(path.dirname(root), 'infra');
    fs.mkdirSync(path.join(dir, 'specs'), { recursive: true });
    write(path.join(dir, 'CLAUDE.md'), '# infra\n');
    write(path.join(dir, 'specs', 'status.md'), 'x\n');
    runCli(['ecosystem', 'add', '../infra', '--role', 'infra', '--id', 'infra'], { cwd: root });

    const res = start(root, ['--contribute', 'infra:phase:phase-1-x']);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr + res.stdout, /not in this initiative's repos/);
  } finally { rmrf(tmp); }
});

test('start refuses a closed initiative', () => {
  const { tmp, root } = setup();
  try {
    const loaded = initiativeOf(root);
    initLib.writeInitiative(
      loaded.filePath,
      { ...loaded.frontmatter, status: 'closed', closed: '2026-07-27' },
      loaded.content,
    );
    const res = start(root, ['--contribute', 'backend:phase:phase-12-attachments']);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr + res.stdout, /is closed/);
  } finally { rmrf(tmp); }
});

test('start sets the initiative active and routes to each member lifecycle', () => {
  const { tmp, root } = setup();
  try {
    const res = start(root, [
      '--contribute', 'backend:phase:phase-12-attachments',
      '--contribute', 'frontend:adhoc:fix-BUG-031-upload',
    ]);
    assert.equal(res.status, 0, res.stderr);

    // Routes to each member's OWN ritual rather than scaffolding across repos.
    assert.match(res.stdout, /cd \.\.\/backend && \/start-phase/);
    assert.match(res.stdout, /cd \.\.\/frontend && \/hotfix/);

    const teamState = require('../core/ecosystem/lib/team-state');
    const active = teamState.getActiveInitiative(root);
    assert.equal(active && active.slug, 'attachments');
  } finally { rmrf(tmp); }
});

test('start never writes into a member repo', () => {
  const { tmp, root } = setup();
  try {
    const backend = path.join(tmp, 'backend');
    const before = fs.readdirSync(path.join(backend, 'specs')).sort();

    start(root, ['--contribute', 'backend:phase:phase-12-attachments']);

    assert.deepEqual(fs.readdirSync(path.join(backend, 'specs')).sort(), before,
      'initiative start must not scaffold inside a member repo — each member '
      + 'owns its specs/, and its own /start-phase creates the record');
  } finally { rmrf(tmp); }
});

test('start refuses to write an invalid manifest', () => {
  const { tmp, root } = setup();
  try {
    // Corrupt the manifest so the post-edit validation must catch it.
    const m = manifestOf(root);
    m.members[0].role = 'not-a-role';
    fs.writeFileSync(path.join(root, 'ecosystem.json'), JSON.stringify(m, null, 2));

    const res = start(root, ['--edge', 'frontend:backend:api-contract']);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr + res.stdout, /refusing to write an invalid ecosystem\.json/);
  } finally { rmrf(tmp); }
});
