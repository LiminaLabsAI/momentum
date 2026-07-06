'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf } = require('./_helpers');
const manifestLib = require('../core/swarm/lib/manifest');
const briefLib = require('../core/swarm/lib/brief');

const REPO_ROOT = path.resolve(__dirname, '..');

// ─────────────────────────────────────────────────────────────────────────────
// JSON Schemas exist + parse as JSON
// ─────────────────────────────────────────────────────────────────────────────

test('swarm schemas — all 4 files exist and parse as valid JSON', () => {
  const dir = path.join(REPO_ROOT, 'core', 'swarm', 'schema');
  const expected = ['manifest.schema.json', 'board.schema.json', 'contract.schema.json', 'dispatch-run.schema.json'];
  for (const name of expected) {
    const p = path.join(dir, name);
    assert.equal(fs.existsSync(p), true, `${name} should exist`);
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    assert.equal(parsed.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(parsed.type, 'object');
    assert.ok(parsed.title.length > 0, 'title required');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Manifest validation — happy path
// ─────────────────────────────────────────────────────────────────────────────

function validManifest() {
  return {
    swarm_id: '0001-user-auth',
    version: 1,
    saga_id: 'sg_8f3a2b1c',
    mode: 'checkpoint',
    initiative: 'user-auth',
    created: '2026-06-12T17:00:00Z',
    ecosystem: 'cerebrio',
    repos: {
      'shared-types': {
        wave: 1, status: 'queued', phase_slug: 'phase-3-user-auth',
        branch: 'phase-3-user-auth', owner: 'sess-1',
      },
      backend: {
        wave: 2, status: 'queued', phase_slug: 'phase-3-user-auth',
        branch: 'phase-3-user-auth', owner: 'sess-1',
      },
    },
    waves: [
      { index: 1, repos: ['shared-types'] },
      { index: 2, repos: ['backend'] },
    ],
  };
}

test('validateManifest — accepts a minimal valid manifest', () => {
  const v = manifestLib.validateManifest(validManifest());
  assert.equal(v.ok, true, v.ok ? '' : JSON.stringify(v.errors, null, 2));
});

test('validateManifest — rejects bad swarm_id', () => {
  const m = validManifest();
  m.swarm_id = 'no-prefix';
  const v = manifestLib.validateManifest(m);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.path === '$.swarm_id'));
});

test('validateManifest — rejects unknown mode', () => {
  const m = validManifest();
  m.mode = 'yolo';
  const v = manifestLib.validateManifest(m);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.path === '$.mode'));
});

test('validateManifest — rejects wave referencing unknown repo', () => {
  const m = validManifest();
  m.waves[0].repos = ['ghost'];
  const v = manifestLib.validateManifest(m);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.message.includes('unknown repo')));
});

test('validateManifest — rejects duplicate wave index', () => {
  const m = validManifest();
  m.waves[1].index = 1;
  const v = manifestLib.validateManifest(m);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.message.includes('duplicate wave index')));
});

test('validateManifest — rejects repo missing required fields', () => {
  const m = validManifest();
  delete m.repos.backend.branch;
  const v = manifestLib.validateManifest(m);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.path.endsWith('.branch')));
});

test('validateManifest — rejects malformed phase_slug', () => {
  const m = validManifest();
  m.repos.backend.phase_slug = 'not-a-phase';
  const v = manifestLib.validateManifest(m);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.path.endsWith('.phase_slug')));
});

// ─────────────────────────────────────────────────────────────────────────────
// CRUD — write + load + update under mkdir lock
// ─────────────────────────────────────────────────────────────────────────────

test('writeManifest + loadManifest — round-trip', () => {
  const tmp = mktmp();
  try {
    const m = validManifest();
    manifestLib.writeManifest(tmp, m.swarm_id, m);
    const loaded = manifestLib.loadManifest(tmp, m.swarm_id);
    assert.deepEqual(loaded, m);

    const dir = manifestLib.swarmDir(tmp, m.swarm_id);
    for (const reserved of manifestLib.RESERVED_DIRS) {
      assert.equal(fs.existsSync(path.join(dir, reserved)), true, `reserved dir ${reserved} should exist`);
    }
  } finally {
    rmrf(tmp);
  }
});

test('writeManifest — rejects invalid manifest', () => {
  const tmp = mktmp();
  try {
    const m = validManifest();
    m.mode = 'yolo';
    assert.throws(() => manifestLib.writeManifest(tmp, m.swarm_id, m), /validation failed/);
  } finally {
    rmrf(tmp);
  }
});

test('updateManifest — mutates atomically under lock', () => {
  const tmp = mktmp();
  try {
    const m = validManifest();
    manifestLib.writeManifest(tmp, m.swarm_id, m);
    manifestLib.updateManifest(tmp, m.swarm_id, (current) => {
      current.repos.backend.status = 'running';
      current.repos.backend.tasks_done = 3;
      current.repos.backend.tasks_total = 9;
    });
    const loaded = manifestLib.loadManifest(tmp, m.swarm_id);
    assert.equal(loaded.repos.backend.status, 'running');
    assert.equal(loaded.repos.backend.tasks_done, 3);
  } finally {
    rmrf(tmp);
  }
});

test('appendAudit — appends event and persists', () => {
  const tmp = mktmp();
  try {
    const m = validManifest();
    manifestLib.writeManifest(tmp, m.swarm_id, m);
    manifestLib.appendAudit(tmp, m.swarm_id, {
      ts: '2026-06-12T17:05:00Z', actor: 'sess-1', event: 'start',
    });
    const loaded = manifestLib.loadManifest(tmp, m.swarm_id);
    assert.equal(loaded.audit.length, 1);
    assert.equal(loaded.audit[0].event, 'start');
  } finally {
    rmrf(tmp);
  }
});

test('listSwarms — returns sorted swarm ids', () => {
  const tmp = mktmp();
  try {
    const m1 = validManifest();
    const m2 = Object.assign({}, validManifest(), { swarm_id: '0002-billing' });
    manifestLib.writeManifest(tmp, m1.swarm_id, m1);
    manifestLib.writeManifest(tmp, m2.swarm_id, m2);
    const ids = manifestLib.listSwarms(tmp);
    assert.deepEqual(ids, ['0001-user-auth', '0002-billing']);
  } finally {
    rmrf(tmp);
  }
});

test('nextSwarmId — increments past existing dirs', () => {
  const tmp = mktmp();
  try {
    fs.mkdirSync(path.join(tmp, 'swarms', '0001-foo'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'swarms', '0005-bar'), { recursive: true });
    const id = manifestLib.nextSwarmId(tmp, 'new-feature');
    assert.equal(id, '0006-new-feature');
  } finally {
    rmrf(tmp);
  }
});

test('nextSwarmId — rejects invalid slug', () => {
  const tmp = mktmp();
  try {
    assert.throws(() => manifestLib.nextSwarmId(tmp, 'Bad Slug'), /must match/);
  } finally {
    rmrf(tmp);
  }
});

test('makeSagaId — deterministic given (swarmId, seed)', () => {
  const a = manifestLib.makeSagaId('0001-foo', 0);
  const b = manifestLib.makeSagaId('0001-foo', 0);
  const c = manifestLib.makeSagaId('0001-foo', 1);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^sg_[a-z0-9]{4,16}$/);
});

// ─────────────────────────────────────────────────────────────────────────────
// Brief frontmatter
// ─────────────────────────────────────────────────────────────────────────────

test('parseSwarmFrontmatter — extracts swarm/wave/initiative/session', () => {
  const raw =
    '---\n' +
    'swarm: 0001-user-auth\n' +
    'wave: 2\n' +
    'initiative: user-auth\n' +
    'claimed_by_session: abc-123\n' +
    '---\n' +
    '\n' +
    '# Phase 3 — User auth backend\n';
  const { frontmatter, body } = briefLib.parseSwarmFrontmatter(raw);
  assert.equal(frontmatter.swarm, '0001-user-auth');
  assert.equal(frontmatter.wave, 2);
  assert.equal(frontmatter.initiative, 'user-auth');
  assert.equal(frontmatter.claimed_by_session, 'abc-123');
  assert.match(body, /^# Phase 3/);
});

test('parseSwarmFrontmatter — solo brief returns null frontmatter', () => {
  const raw = '# Phase 3 — Solo phase\n\nContent here.\n';
  const { frontmatter, body } = briefLib.parseSwarmFrontmatter(raw);
  assert.equal(frontmatter, null);
  assert.equal(body, raw);
});

test('validateSwarmFrontmatter — null is valid (solo brief)', () => {
  const v = briefLib.validateSwarmFrontmatter(null);
  assert.equal(v.ok, true);
});

test('validateSwarmFrontmatter — requires swarm + wave together', () => {
  const v = briefLib.validateSwarmFrontmatter({ initiative: 'foo' });
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.path === '$.swarm'));
  assert.ok(v.errors.some((e) => e.path === '$.wave'));
});

test('validateSwarmFrontmatter — wave must be positive integer', () => {
  const v = briefLib.validateSwarmFrontmatter({ swarm: '0001-foo', wave: 0 });
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.path === '$.wave'));
});

test('injectSwarmFrontmatter — prepends fresh block', () => {
  const tmp = mktmp();
  try {
    const file = path.join(tmp, 'overview.md');
    fs.writeFileSync(file, '# Phase 3 — Solo\n');
    briefLib.injectSwarmFrontmatter(file, {
      swarm: '0001-user-auth', wave: 1, initiative: 'user-auth',
    });
    const written = fs.readFileSync(file, 'utf8');
    assert.match(written, /^---\n/);
    assert.match(written, /^swarm: 0001-user-auth$/m);
    assert.match(written, /^wave: 1$/m);
    assert.match(written, /# Phase 3 — Solo/);
  } finally {
    rmrf(tmp);
  }
});

test('injectSwarmFrontmatter — merges with existing block, preserves body', () => {
  const tmp = mktmp();
  try {
    const file = path.join(tmp, 'overview.md');
    fs.writeFileSync(file,
      '---\nswarm: 0001-old\nwave: 1\n---\n\n# Phase 3 — Existing\n');
    briefLib.injectSwarmFrontmatter(file, {
      swarm: '0002-new', wave: 2, claimed_by_session: 'xyz',
    });
    const written = fs.readFileSync(file, 'utf8');
    assert.match(written, /swarm: 0002-new/);
    assert.match(written, /wave: 2/);
    assert.match(written, /claimed_by_session: xyz/);
    assert.match(written, /# Phase 3 — Existing/);
  } finally {
    rmrf(tmp);
  }
});
