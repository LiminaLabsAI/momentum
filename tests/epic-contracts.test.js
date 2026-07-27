'use strict';

/**
 * Phase 32b G0 — the epic-tier contracts: ADR-0020, the epic record schema, and
 * the grant shape now written into `run.schema.json`'s reserved field.
 *
 * G0 ships shapes, not behaviour — same discipline as 32a G0, so G1 (epic
 * library) and G2 (grant) cannot drift while they proceed in parallel.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');

const EPIC_SCHEMA = path.join(REPO_ROOT, 'core', 'run', 'schema', 'epic.schema.json');
const RUN_SCHEMA = path.join(REPO_ROOT, 'core', 'run', 'schema', 'run.schema.json');
const ADR = path.join(REPO_ROOT, 'specs', 'decisions', '0020-scope-grant-authorization.md');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// ─────────────────────────────────────────────────────────────────────────────
// ADR-0020 — the honesty requirements
// ─────────────────────────────────────────────────────────────────────────────

test('ADR-0020 states what a mistake can now do that it could not before', () => {
  // The plan's G0.1 requires the counter-case argued, not asserted away. An ADR
  // that only lists mitigations is a rationalization, and this project has a
  // documented history of overstating its own guarantees (BUG-009).
  const adr = fs.readFileSync(ADR, 'utf8');
  assert.match(adr, /What a mistake or a compromise can do after this ADR that it could not\s*\nbefore/);
  assert.match(adr, /covers work the operator has not read/);
  assert.match(adr, /blast radius of a single stolen or mistaken "yes" grows by N/);
  assert.match(adr, /window is time, not action/);
});

test('ADR-0020 does not claim the trust layer is unchanged', () => {
  const adr = fs.readFileSync(ADR, 'utf8');
  assert.match(adr, /That is not true/, 'the ADR must reject the comfortable framing explicitly');
  assert.match(adr, /compensating controls, not equivalents/);
});

test('ADR-0020 keeps the ADR-0009 floor and the additive property', () => {
  const adr = fs.readFileSync(ADR, 'utf8');
  assert.match(adr, /invariant floor is untouched/i);
  assert.match(adr, /Additive, never weaker/);
  assert.match(adr, /never \*whether a yes is required\*/);
});

// ─────────────────────────────────────────────────────────────────────────────
// Epic record schema
// ─────────────────────────────────────────────────────────────────────────────

test('the epic schema is well-formed and typed for OKF', () => {
  const s = readJson(EPIC_SCHEMA);
  assert.equal(s.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(s.properties.type.const, 'Epic');
  assert.deepEqual(s.required, ['type', 'id', 'slug', 'status', 'phases']);
});

test('the epic schema does NOT encode execution order in its phase list', () => {
  // ADR-0003: one topological sort in the codebase. Reading order from `phases`
  // would be a second one, hidden in a field that merely looks like a list.
  const s = readJson(EPIC_SCHEMA);
  assert.match(s.properties.phases.description, /Execution order is NOT read from this array/);
  assert.match(s.properties.phases.description, /core\/waves/);
});

test('the epic body stays free-form — the agent reads it, it does not own it', () => {
  const s = readJson(EPIC_SCHEMA);
  assert.equal(s.additionalProperties, true, 'unknown frontmatter keys must be tolerated');
  assert.match(s.description, /does not reformat/);
});

test('the bootstrap epic record satisfies its own schema', () => {
  // The hand-authored 0001 record predates the schema. If it fails to validate,
  // the SCHEMA is wrong — the record is the specification, since it is what a
  // human actually found useful to write.
  const raw = fs.readFileSync(
    path.join(REPO_ROOT, 'specs', 'epics', '0001-autonomous-execution.md'), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(fm, 'the bootstrap record must have frontmatter');

  const block = fm[1];
  assert.match(block, /^type: Epic$/m);
  assert.match(block, /^id: "0001"$/m);
  assert.match(block, /^slug: autonomous-execution$/m);
  assert.match(block, /^status: (planned|in-progress|complete|abandoned)$/m);
  assert.match(block, /^phases:$/m);
  for (const p of ['phase-32a-governor', 'phase-32b-epic-tier', 'phase-32c-adapter-parity', 'phase-32d-cross-repo']) {
    assert.ok(block.includes(p), `${p} must be listed`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Grant shape — bounded on three axes
// ─────────────────────────────────────────────────────────────────────────────

test('the grant is bounded on scope, time and count — all three required', () => {
  const g = readJson(RUN_SCHEMA).properties.grant;
  assert.equal(g.additionalProperties, false, '32a left this open; 32b closes it');
  for (const field of ['grant_id', 'epic', 'branches', 'expires', 'landings_remaining']) {
    assert.ok(g.required.includes(field), `${field} must be required — an unbounded axis is an unbounded grant`);
  }
  assert.equal(g.properties.branches.minItems, 1, 'a grant with no branches would scope nothing');
  assert.equal(g.properties.landings_remaining.minimum, 0);
});

test('the grant expiry is absolute, and the schema says why', () => {
  const g = readJson(RUN_SCHEMA).properties.grant;
  assert.match(g.properties.expires.description, /never sliding/);
  assert.match(g.properties.expires.description, /hour three would otherwise still hold hour zero/);
});

test('consumptions are recorded before the push, not after', () => {
  // This is the compensating control for the human no longer being present at
  // each protected write. Recorded after the fact, it would miss exactly the
  // pushes that went wrong.
  const g = readJson(RUN_SCHEMA).properties.grant;
  assert.match(g.properties.consumptions.description, /BEFORE the push proceeds/);
  assert.deepEqual(g.properties.consumptions.items.required, ['ts', 'branch']);
});

test('the grant is documented as additive to the sentinel, never a replacement', () => {
  const g = readJson(RUN_SCHEMA).properties.grant;
  assert.match(g.description, /ALONGSIDE the single-use merge-approved sentinel, never replacing it/);
  assert.match(g.description, /byte-identically to v0\.42\.0/);
});

test('zero landings means exhausted, not unlimited', () => {
  // The off-by-one that would turn a budget into its opposite.
  const g = readJson(RUN_SCHEMA).properties.grant;
  assert.match(g.properties.landings_remaining.description, /Zero is `exhausted`, not unlimited/);
});
