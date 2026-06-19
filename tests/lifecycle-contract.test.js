'use strict';

/**
 * Phase 19 — Lifecycle Hardening, Group 0.
 *
 * Unit tests for the canonical lifecycle contract
 * (core/scripts/git-hooks/contract.js) — pure functions, no git side effects —
 * plus presence/shape checks on the ad-hoc record template and contract doc.
 *
 * The git hooks (Group 1) and /hotfix (Group 2) build on these functions; this
 * file is the test oracle that keeps the single source of truth honest.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');
const C = require('../core/git-hooks/contract');

test('CONTRACT exposes the canonical constants', () => {
  assert.equal(C.CONTRACT.hooksPath, '.githooks');
  assert.equal(C.CONTRACT.skipEnv, 'MOMENTUM_SKIP_HOOKS');
  assert.equal(C.CONTRACT.mergeApprovedSentinel, '.momentum/merge-approved');
  assert.equal(C.CONTRACT.verifyEvidenceHeading, '## Verification Evidence');
  assert.ok(C.CONTRACT.protectedBranches.includes('main'));
  assert.ok(C.CONTRACT.protectedBranches.includes('staging'));
  assert.deepEqual(C.CONTRACT.workTypes, ['phase', 'quick-task', 'spike']);
  // momentum's stated 6 types must all be present.
  for (const t of ['feat', 'fix', 'docs', 'refactor', 'chore', 'infra']) {
    assert.ok(C.CONTRACT.conventionalTypes.includes(t), `missing type ${t}`);
  }
  // 'test' must be allowed — the project itself uses test(scope): commits.
  assert.ok(C.CONTRACT.conventionalTypes.includes('test'));
});

test('isValidCommitSubject accepts conventional subjects', () => {
  for (const s of [
    'feat: add hook installer',
    'fix(install): warn-not-clobber on existing core.hooksPath',
    'docs: reword Rule 6',
    'refactor(core)!: breaking change',
    'chore(release): v0.21.0',
    'infra: ci tweak',
    'test(phase-19): verification evidence',
  ]) {
    assert.equal(C.isValidCommitSubject(s), true, `should accept: ${s}`);
  }
});

test('isValidCommitSubject rejects non-conventional subjects', () => {
  for (const s of [
    'added a thing',
    'WIP',
    'Fixed the bug',          // capitalized non-type
    'feat add hook',          // missing colon
    'feat:no space',          // missing space after colon
    'unknowntype: whatever',  // type not in allow-list
    '',
  ]) {
    assert.equal(C.isValidCommitSubject(s), false, `should reject: ${s}`);
  }
});

test('commit-msg bypass: merge/revert/fixup/squash subjects are allowed', () => {
  for (const s of [
    "Merge branch 'main' into feature",
    'Revert "feat: oops"',
    'fixup! feat: earlier commit',
    'squash! fix: tidy',
    'Initial commit',
  ]) {
    assert.equal(C.isValidCommitSubject(s), true, `bypass should allow: ${s}`);
  }
});

test('validateCommitMessage finds the subject past comment + blank lines', () => {
  const msg = [
    '',
    '# Please enter the commit message for your changes.',
    'feat(git): install hooks via core.hooksPath',
    '',
    'Body paragraph here.',
  ].join('\n');
  const r = C.validateCommitMessage(msg);
  assert.equal(r.subject, 'feat(git): install hooks via core.hooksPath');
  assert.equal(r.valid, true);
});

test('skipRequested honors truthy / falsy env values', () => {
  assert.equal(C.skipRequested({ MOMENTUM_SKIP_HOOKS: '1' }), true);
  assert.equal(C.skipRequested({ MOMENTUM_SKIP_HOOKS: 'true' }), true);
  assert.equal(C.skipRequested({ MOMENTUM_SKIP_HOOKS: 'yes' }), true);
  assert.equal(C.skipRequested({ MOMENTUM_SKIP_HOOKS: '0' }), false);
  assert.equal(C.skipRequested({ MOMENTUM_SKIP_HOOKS: 'false' }), false);
  assert.equal(C.skipRequested({ MOMENTUM_SKIP_HOOKS: '' }), false);
  assert.equal(C.skipRequested({}), false);
});

test('ref parsing: branch / tag / release-tag / protected', () => {
  assert.equal(C.branchFromRef('refs/heads/main'), 'main');
  assert.equal(C.branchFromRef('refs/tags/v1.0.0'), null);
  assert.equal(C.tagFromRef('refs/tags/v1.2.3'), 'v1.2.3');
  assert.equal(C.tagFromRef('refs/heads/main'), null);
  assert.equal(C.isReleaseTag('v0.21.0'), true);
  assert.equal(C.isReleaseTag('v1.2.3-rc.1'), true);
  assert.equal(C.isReleaseTag('nightly'), false);
  assert.equal(C.branchIsProtected('main'), true);
  assert.equal(C.branchIsProtected('staging'), true);
  assert.equal(C.branchIsProtected('phase-19-lifecycle-hardening'), false);
});

test('retroHasEvidence: true only with a non-empty evidence section', () => {
  const withEvidence = [
    '# Retrospective',
    '## Verification Evidence',
    '```',
    '$ npm test',
    '580 passing',
    '```',
    '## Next',
  ].join('\n');
  assert.equal(C.retroHasEvidence(withEvidence), true);

  const emptySection = [
    '## Verification Evidence',
    '',
    '## Next steps',
  ].join('\n');
  assert.equal(C.retroHasEvidence(emptySection), false);

  const noSection = '# Retrospective\nNo evidence heading here.';
  assert.equal(C.retroHasEvidence(noSection), false);
  assert.equal(C.retroHasEvidence(''), false);
});

test('parsePrePushLine parses well-formed lines and rejects junk', () => {
  const ok = C.parsePrePushLine('refs/heads/main abc123 refs/heads/main def456');
  assert.deepEqual(ok, {
    localRef: 'refs/heads/main',
    localSha: 'abc123',
    remoteRef: 'refs/heads/main',
    remoteSha: 'def456',
  });
  assert.equal(C.parsePrePushLine(''), null);
  assert.equal(C.parsePrePushLine('only two parts'), null);
});

test('ad-hoc record template ships with the required sections', () => {
  for (const rel of [
    'core/specs-templates/specs/adhoc/_TEMPLATE.md',
    'core/specs-templates/specs/adhoc/README.md',
  ]) {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, rel)), `missing ${rel}`);
  }
  const tpl = fs.readFileSync(
    path.join(REPO_ROOT, 'core/specs-templates/specs/adhoc/_TEMPLATE.md'),
    'utf8'
  );
  for (const heading of [
    '## Current Behavior',
    '## Expected Behavior',
    '## Unchanged Behavior',
    C.CONTRACT.verifyEvidenceHeading, // ad-hoc records reuse the same gate marker
  ]) {
    assert.match(tpl, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('lifecycle-contract reference doc exists', () => {
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'core/lifecycle-contract.md')));
});
