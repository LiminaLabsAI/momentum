'use strict';

/**
 * Phase 28 G0 — `specs/project-rules.md` migration (ADR-0010). The instruction
 * file's `## Project Extensions` becomes a managed pointer; authored prose is
 * migrated (never dropped) into project-rules.md; idempotent. Plus a BUG-027
 * guard on the adapter recipe-table rows.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');
const pr = require(path.join(REPO_ROOT, 'core', 'lib', 'project-rules'));

function mktmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'momentum-projrules-')); }

const BOILERPLATE = [
  '## Project Extensions',
  '',
  '> Everything below this heading is preserved across `momentum upgrade`.',
  '> Add project-specific rules here.',
  '',
].join('\n');

const AUTHORED = [
  '### Project-Specific: Release Checklist',
  '',
  'Run `gh release create` then `npm publish`.',
  '',
  '### Project-Specific Constraint',
  '',
  'Template files must be generic.',
].join('\n');

test('extractAuthoredProse strips heading + boilerplate; empty for boilerplate-only/pointer', () => {
  assert.equal(pr.extractAuthoredProse('\n' + BOILERPLATE), '', 'boilerplate-only → no prose');
  const withProse = '\n' + BOILERPLATE + AUTHORED + '\n';
  const got = pr.extractAuthoredProse(withProse);
  assert.match(got, /Release Checklist/);
  assert.match(got, /Template files must be generic/);
  assert.equal(pr.extractAuthoredProse('\n' + pr.renderPointerBlock()), '', 'pointer → no prose');
});

test('pointerizeContent replaces extensions with the pointer, preserves managed', () => {
  const content = '# Managed rules\n\nRule 1.\n\n' + BOILERPLATE + AUTHORED + '\n';
  const out = pr.pointerizeContent(content);
  assert.match(out, /# Managed rules/);
  assert.match(out, /Rule 1\./);
  assert.ok(pr.isPointerized(out), 'has the pointer sentinel');
  assert.doesNotMatch(out, /Release Checklist/, 'authored prose no longer inline');
});

test('migrateProjectExtensions moves prose to project-rules.md, rewrites file as pointer, idempotent', () => {
  const dir = mktmp();
  try {
    const specs = path.join(dir, 'specs');
    fs.mkdirSync(specs, { recursive: true });
    const claude = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(claude, '# Rules\n\nRule 1.\n\n' + BOILERPLATE + AUTHORED + '\n');

    const r1 = pr.migrateProjectExtensions(claude, specs, { projectName: 'demo' });
    assert.ok(r1.changed && r1.appended, JSON.stringify(r1));

    const rulesFile = path.join(specs, 'project-rules.md');
    assert.ok(fs.existsSync(rulesFile), 'project-rules.md created');
    const rules = fs.readFileSync(rulesFile, 'utf8');
    assert.match(rules, /type: Project Rules/);
    assert.match(rules, /Release Checklist/, 'prose migrated');
    assert.match(rules, /Migrated from CLAUDE\.md/);

    const rewritten = fs.readFileSync(claude, 'utf8');
    assert.ok(pr.isPointerized(rewritten), 'instruction file now points');
    assert.doesNotMatch(rewritten, /Release Checklist/, 'prose no longer in instruction file');
    assert.match(rewritten, /Rule 1\./, 'managed content preserved');

    // idempotent: second run is a no-op (already pointer), no double-append
    const r2 = pr.migrateProjectExtensions(claude, specs, { projectName: 'demo' });
    assert.ok(r2.alreadyPointer && !r2.appended && !r2.changed, JSON.stringify(r2));
    const rules2 = fs.readFileSync(rulesFile, 'utf8');
    assert.equal((rules2.match(/Migrated from CLAUDE\.md/g) || []).length, 1, 'no duplicate migration block');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('migrateProjectExtensions with only boilerplate rewrites to pointer without appending', () => {
  const dir = mktmp();
  try {
    const specs = path.join(dir, 'specs');
    fs.mkdirSync(specs, { recursive: true });
    const agents = path.join(dir, 'AGENTS.md');
    fs.writeFileSync(agents, '# Rules\n\n' + BOILERPLATE);
    const r = pr.migrateProjectExtensions(agents, specs, {});
    assert.ok(r.changed && !r.appended, JSON.stringify(r));
    assert.ok(pr.isPointerized(fs.readFileSync(agents, 'utf8')));
    assert.ok(!fs.existsSync(path.join(specs, 'project-rules.md')), 'nothing to migrate → no file');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('BUG-027: adapter recipe-table sync-config rows are well-formed (trailing pipe)', () => {
  for (const f of [
    'adapters/opencode/instructions/surfaces.md',
    'adapters/opencode/instructions/AGENTS.md',
    'adapters/codex/instructions/surfaces.md',
    'adapters/codex/instructions/AGENTS.md',
  ]) {
    const body = fs.readFileSync(path.join(REPO_ROOT, f), 'utf8');
    const row = body.split('\n').find((l) => l.includes('| sync-config |'));
    assert.ok(row, `${f} has a sync-config row`);
    assert.match(row.trimEnd(), /\|$/, `${f} sync-config row ends with a pipe`);
  }
});
