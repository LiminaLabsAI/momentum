'use strict';

/**
 * Phase 32a G0 — the contracts everything else in Epic 0001 builds against:
 * the versioned run-manifest schema, the governor contract, and the
 * decision-authority trigger table (ADR-0019).
 *
 * These are shape tests, deliberately. G0 ships no behaviour — it fixes the
 * shapes so G1 (classifier) and G2 (park primitive) cannot drift apart while
 * they proceed in parallel, and so Phase 32c can implement the re-invoker
 * backend against a written contract rather than against 32a's code.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');

const RUN_DIR = path.join(REPO_ROOT, 'core', 'run');
const SCHEMA_PATH = path.join(RUN_DIR, 'schema', 'run.schema.json');
const CONTRACT_PATH = path.join(RUN_DIR, 'CONTRACT.md');

const triggers = require(path.join(RUN_DIR, 'lib', 'authority-triggers'));

// ─────────────────────────────────────────────────────────────────────────────
// run.schema.json
// ─────────────────────────────────────────────────────────────────────────────

test('run schema is well-formed JSON Schema with a pinned version', () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.match(schema.$id, /run-v1\.json$/);
  assert.equal(schema.type, 'object');
  assert.equal(schema.additionalProperties, false,
    'unknown top-level fields must be rejected — a permissive resume format hides migration bugs');

  // P5: versioned from commit one. An unversioned resume format is a migration trap.
  assert.equal(schema.properties.schema_version.const, 1);
});

test('run schema requires exactly the fields a resume cannot proceed without', () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

  // Each of these is load-bearing for reconstituting a run from disk alone
  // (D7 — agents are stateless across turns; state lives in files).
  for (const field of ['schema_version', 'run_id', 'tier', 'target', 'status', 'policy', 'cursor', 'created']) {
    assert.ok(schema.required.includes(field), `${field} must be required`);
  }
});

test('run schema is tier-agnostic — all four scales, no tier-specific fields', () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

  // ADR-0003's one-engine principle applied to execution: one runner serves
  // every tier, so the manifest must not privilege one.
  assert.deepEqual(schema.properties.tier.enum, ['group', 'phase', 'epic', 'initiative']);

  const props = Object.keys(schema.properties);
  for (const leaked of ['phase', 'epic', 'group', 'initiative', 'repo', 'swarm_id']) {
    assert.ok(!props.includes(leaked),
      `top-level "${leaked}" would bind the manifest to one tier`);
  }
});

test('run schema policy encodes the floor rules as type constraints, not prose', () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const policy = schema.properties.policy;

  assert.deepEqual(policy.required, ['release', 'push', 'tdd']);

  // Floor rule: an autonomous run always pushes. There is deliberately no
  // `never` — multiple phases of work in a local worktree is one crash from
  // total loss, so the option does not exist to be chosen by mistake.
  assert.ok(!policy.properties.push.enum.includes('never'),
    'push: never must be unrepresentable, not merely discouraged');
  assert.deepEqual(policy.properties.push.enum, ['per-group', 'per-phase']);

  assert.deepEqual(policy.properties.release.enum, ['per-phase', 'per-feature', 'manual']);
  assert.deepEqual(policy.properties.tdd.enum, ['strict', 'opt-in']);
});

test('run schema reserves 32b surfaces without pre-committing their shape', () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

  // `grant` is ADR-0020's one-way door on the trust layer. 32a reserves the
  // field so resume formats do not break, but leaves the shape open so 32b can
  // decide it against real machinery.
  assert.equal(schema.properties.grant.additionalProperties, true,
    'grant shape belongs to ADR-0020 (32b), not to 32a');
  assert.ok(schema.properties.amendments, 'amendments channel reserved for 32b (D11)');
});

test('run schema treats an unclassified amendment as the dangerous kind', () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const kinds = schema.properties.amendments.items.properties.kind.enum;

  assert.deepEqual(kinds, ['forward-only', 'backward-invalidating', 'unclassified']);
  assert.match(
    schema.properties.amendments.items.properties.kind.description,
    /unclassified is treated as backward-invalidating/,
    'the safe direction must be documented at the schema, where implementers read it'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT.md
// ─────────────────────────────────────────────────────────────────────────────

test('governor contract states the invariant as "the next unit starts"', () => {
  const contract = fs.readFileSync(CONTRACT_PATH, 'utf8');

  // D2. The rejected phrasing ("block the stop") is Claude-Code-shaped and
  // cannot be satisfied by Codex or opencode, which only observe a turn ending.
  assert.match(contract, /\*\*The next unit starts\.\*\*/);
  assert.match(contract, /not "the agent is blocked from stopping/i);
});

test('governor contract documents both backends and their adapters', () => {
  const contract = fs.readFileSync(CONTRACT_PATH, 'utf8');

  assert.match(contract, /\| \*\*interceptor\*\* \| Claude Code, Antigravity \|/);
  assert.match(contract, /\| \*\*re-invoker\*\* \| Codex, opencode \|/);

  // The re-invoker is not a degraded mode — it is the external-driver
  // architecture, which is why it cannot rot the way BUG-031 did.
  assert.match(contract, /BUG-031/);
});

test('governor contract orders the kill switch above every other branch', () => {
  const contract = fs.readFileSync(CONTRACT_PATH, 'utf8');

  const killIdx = contract.indexOf('Kill switch present');
  const budgetIdx = contract.indexOf('Budget exhausted');
  const continueIdx = contract.indexOf('| 7 |');

  assert.ok(killIdx > 0 && budgetIdx > killIdx && continueIdx > budgetIdx,
    'the kill switch must be checked before anything the agent could reason past');
  assert.match(contract, /the agent is the thing that may be misbehaving/i);
});

test('governor contract requires fail-open and idempotent backends', () => {
  const contract = fs.readFileSync(CONTRACT_PATH, 'utf8');

  // A broken governor trapping a session would be strictly worse than no
  // governor at all.
  assert.match(contract, /\*\*Fail-open\.\*\*/);
  assert.match(contract, /\*\*Idempotence\.\*\*/);
  assert.match(contract, /byte-identically\*\* to\s+v0\.42\.0/,
    'the invariance guarantee belongs in the contract, not only in the plan');
});

// ─────────────────────────────────────────────────────────────────────────────
// Authority trigger table (ADR-0019)
// ─────────────────────────────────────────────────────────────────────────────

test('trigger table is data: frozen, uniquely identified, fully described', () => {
  assert.ok(Object.isFrozen(triggers.OPERATOR_TRIGGERS));

  const ids = triggers.OPERATOR_TRIGGERS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'trigger ids must be unique');

  for (const t of triggers.OPERATOR_TRIGGERS) {
    assert.ok(Object.isFrozen(t), `${t.id} must be frozen — the table is data, not scratch space`);
    assert.ok(t.rule, `${t.id} must cite the rule it derives from`);
    assert.ok(t.description && t.description.length > 40, `${t.id} needs a real description`);
    assert.equal(typeof t.floor, 'boolean', `${t.id} must declare whether config can disable it`);
    assert.ok(t.match && typeof t.match === 'object', `${t.id} needs a declarative match spec`);
  }
});

test('trigger table covers every Rule 14 escalation trigger', () => {
  // ADR-0019's whole claim is that Rule 14 already IS the blast-radius model.
  // If a Rule 14 trigger were missing here, the claim would be false.
  const ids = new Set(triggers.OPERATOR_TRIGGERS.map((t) => t.id));

  for (const required of [
    'architecture-specs',      // "modifies anything under specs/architecture/"
    'needs-adr',               // "needs an ADR"
    'public-contract',         // "changes a public contract/interface"
    'production-file-count',   // "touches more than ~5 files of production code"
    'displaces-planned-work',  // "displaces a planned phase"
  ]) {
    assert.ok(ids.has(required), `Rule 14 trigger "${required}" is missing from the table`);
  }
});

test('the invariant floor is not reachable from config', () => {
  // ADR-0009's split, applied to authority: overrides are widen-only. These
  // four can never be handed to the agent by a project config.
  const floor = triggers.OPERATOR_TRIGGERS.filter((t) => t.floor).map((t) => t.id);

  for (const id of ['architecture-specs', 'trust-layer', 'public-contract', 'needs-adr']) {
    assert.ok(floor.includes(id), `${id} must be a floor trigger`);
  }
});

test('the trigger table guards itself', () => {
  // Editing the table is editing the agent's own authority. Without this path
  // in the trust-layer trigger, an autonomous run could widen its own boundary
  // and log the change as a routine [DECISION].
  const trust = triggers.OPERATOR_TRIGGERS.find((t) => t.id === 'trust-layer');
  assert.ok(
    trust.match.anyPathUnder.some((p) => p.includes('authority-triggers')),
    'the authority table must classify edits to itself as operator-authority'
  );
});

test('non-production prefixes exclude the artifacts a run is meant to produce', () => {
  // Counting tests and specs toward the ~5-file trigger would park every
  // well-behaved phase — the file-count trigger is about production blast
  // radius, not about volume of work.
  for (const p of ['tests/', 'specs/', 'docs/']) {
    assert.ok(triggers.NON_PRODUCTION_PREFIXES.includes(p));
  }
});

test('authority values are exactly the three ADR-0019 defines', () => {
  assert.deepEqual(
    Object.values(triggers.AUTHORITY).sort(),
    ['agent', 'operator', 'park']
  );
});
