'use strict';

// Phase 31a G0 — ecosystem lifecycle contracts (ADR-0016).
//
// Covers the two additive schema surfaces the lifecycle is built on:
//   1. ecosystem.json `config` — ecosystem-tier mechanisms (the coordination
//      root has no specs/, so specs/config.md is unavailable to it).
//   2. initiative frontmatter `contributions` — flat `member:kind:ref` triples
//      linking an initiative to real per-member work records.
//
// Both must be strictly ADDITIVE: manifests and initiatives written before
// Phase 31a must keep validating byte-unchanged.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const lib = require('../core/ecosystem/lib');
const initiative = require('../core/ecosystem/lib/initiative');

function baseManifest(extra = {}) {
  return {
    name: 'eco',
    version: 1,
    members: [
      { id: 'backend', path: '../backend', role: 'platform' },
      { id: 'frontend', path: '../frontend', role: 'client' },
    ],
    ...extra,
  };
}

function baseFrontmatter(extra = {}) {
  return {
    id: 1,
    slug: 'attachments',
    status: 'in-progress',
    started: '2026-07-27',
    owner: 'someone',
    repos: ['backend', 'frontend'],
    ...extra,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ecosystem.json `config`
// ─────────────────────────────────────────────────────────────────────────────

test('manifest: config is optional — a pre-31a manifest still validates', () => {
  assert.equal(lib.validateManifest(baseManifest()).ok, true);
});

test('manifest: config.integration_verify_command accepted', () => {
  const res = lib.validateManifest(baseManifest({
    config: { integration_verify_command: 'npm run e2e' },
  }));
  assert.equal(res.ok, true, JSON.stringify(res.errors));
});

test('manifest: unknown config keys are rejected (typos must not silently no-op)', () => {
  const res = lib.validateManifest(baseManifest({
    config: { integration_verify_commnd: 'npm run e2e' },
  }));
  assert.equal(res.ok, false);
  assert.match(res.errors[0].path, /config\.integration_verify_commnd/);
});

test('manifest: config must be an object, and the command a non-empty string', () => {
  assert.equal(lib.validateManifest(baseManifest({ config: 'nope' })).ok, false);
  assert.equal(lib.validateManifest(baseManifest({ config: [] })).ok, false);
  assert.equal(
    lib.validateManifest(baseManifest({ config: { integration_verify_command: '' } })).ok,
    false,
  );
});

test('readEcosystemConfig: absent config yields null, never a fabricated default', () => {
  // A fabricated default would make `initiative complete` claim it ran a
  // verification the project never declared — the exact silent-pass failure
  // ADR-0016 §5 forbids.
  assert.deepEqual(
    lib.readEcosystemConfig(baseManifest()),
    { integration_verify_command: null },
  );
  assert.deepEqual(
    lib.readEcosystemConfig(baseManifest({ config: {} })),
    { integration_verify_command: null },
  );
  assert.deepEqual(lib.readEcosystemConfig(undefined), { integration_verify_command: null });
});

test('readEcosystemConfig: declared command is returned verbatim', () => {
  const cfg = lib.readEcosystemConfig(baseManifest({
    config: { integration_verify_command: 'make integration' },
  }));
  assert.equal(cfg.integration_verify_command, 'make integration');
});

// ─────────────────────────────────────────────────────────────────────────────
// dependencies[].initiative
// ─────────────────────────────────────────────────────────────────────────────

test('manifest: dependency edges may record the initiative that registered them', () => {
  const res = lib.validateManifest(baseManifest({
    dependencies: [
      { from: 'frontend', to: 'backend', kind: 'api-contract', initiative: 'attachments' },
      { from: 'backend', to: 'frontend', kind: 'deploy' }, // hand-declared, no initiative
    ],
  }));
  assert.equal(res.ok, true, JSON.stringify(res.errors));
});

test('manifest: dependency initiative must be a slug when present', () => {
  const res = lib.validateManifest(baseManifest({
    dependencies: [{ from: 'frontend', to: 'backend', kind: 'library', initiative: 'Not A Slug' }],
  }));
  assert.equal(res.ok, false);
  assert.match(res.errors[0].path, /dependencies\[0\]\.initiative/);
});

// ─────────────────────────────────────────────────────────────────────────────
// initiative `contributions`
// ─────────────────────────────────────────────────────────────────────────────

test('initiative: contributions absent — a pre-31a initiative still validates', () => {
  assert.equal(initiative.validateFrontmatter(baseFrontmatter()).ok, true);
});

test('initiative: well-formed member:kind:ref triples validate', () => {
  const res = initiative.validateFrontmatter(baseFrontmatter({
    contributions: [
      'backend:phase:phase-12-attachments',
      'frontend:adhoc:fix-BUG-031-upload-limit',
    ],
  }));
  assert.equal(res.ok, true, JSON.stringify(res.errors));
});

test('initiative: malformed contributions are rejected', () => {
  const bad = [
    ['backend:phase'],                     // missing ref
    ['backend:release:phase-1'],           // kind not a momentum work type
    ['Backend:phase:phase-1'],             // member not a slug
    ['backend:phase:'],                    // empty ref
    [{ member: 'backend', kind: 'phase', ref: 'x' }], // object form does not round-trip
  ];
  for (const contributions of bad) {
    const res = initiative.validateFrontmatter(baseFrontmatter({ contributions }));
    assert.equal(res.ok, false, `expected rejection for ${JSON.stringify(contributions)}`);
  }
});

test('initiative: contributions must be an array if present', () => {
  assert.equal(
    initiative.validateFrontmatter(baseFrontmatter({ contributions: 'backend:phase:x' })).ok,
    false,
  );
});

test('parseContribution / formatContribution round-trip', () => {
  const parsed = initiative.parseContribution('backend:phase:phase-12-attachments');
  assert.deepEqual(parsed, { member: 'backend', kind: 'phase', ref: 'phase-12-attachments' });
  assert.equal(initiative.formatContribution(parsed), 'backend:phase:phase-12-attachments');
  assert.equal(initiative.parseContribution('garbage'), null);
  assert.throws(() => initiative.formatContribution({ member: 'A', kind: 'phase', ref: 'x' }));
});

test('contributions survive the frontmatter serializer round-trip', () => {
  // The reason contributions are flat strings rather than objects: the
  // dependency-free serializer flattens arrays via String(v), so nested
  // objects would serialize as "[object Object]". This asserts the chosen
  // encoding actually survives serialize -> parse.
  const fm = baseFrontmatter({
    contributions: ['backend:phase:phase-12-attachments', 'frontend:adhoc:fix-BUG-031'],
  });
  const doc = initiative.serializeFrontmatter(fm) + '\n# Body\n';
  const { frontmatter } = initiative.parseFrontmatter(doc);

  assert.deepEqual(frontmatter.contributions, fm.contributions);
  assert.equal(initiative.validateFrontmatter(frontmatter).ok, true);
  assert.deepEqual(frontmatter.repos, fm.repos, 'existing array fields must be unaffected');
});
