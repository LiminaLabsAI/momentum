'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { typeForPath, isReserved, RESERVED } = require('../core/lib/okf-types');

test('taxonomy: every documented mapping resolves (ADR-0005 table)', () => {
  const cases = [
    ['status.md', 'Status'],
    ['backlog/backlog.md', 'Backlog'],
    ['backlog/details/ENH-009.md', 'Backlog Detail'],
    ['planning/roadmap.md', 'Roadmap'],
    ['planning/platform-parallel-lanes.md', 'Planning Note'],
    ['decisions/impact-map.md', 'Impact Map'],
    ['decisions/0005-adopt-okf.md', 'Decision'],
    ['phases/phase-24-okf-adoption/overview.md', 'Phase'],
    ['phases/phase-24-okf-adoption/plan.md', 'Plan'],
    ['phases/phase-24-okf-adoption/tasks.md', 'Task List'],
    ['phases/phase-24-okf-adoption/history.md', 'Phase History'],
    ['phases/phase-21a-lanes-walk/retrospective.md', 'Retrospective'],
    ['phases/phase-21a-lanes-walk/evidence/trial-scorecard.md', 'Evidence'],
    ['adhoc/fix-BUG-014-gitignore/record.md', 'Ad-hoc Record'],
    ['adhoc/_TEMPLATE.md', 'Ad-hoc Record'],
    ['changelog/2026-07.md', 'Changelog'],
    ['architecture/ecosystem.md', 'Architecture Spec'],
    ['vision/principles.md', 'Vision'],
    ['README.md', 'Guide'],
    ['phases/README.md', 'Guide'],
    ['decisions/README.md', 'Guide'],
    ['anything/else/unmatched.md', 'Note'],
  ];
  for (const [path, expected] of cases) {
    assert.equal(typeForPath(path), expected, `typeForPath(${path})`);
  }
});

test('reserved filenames return null at any depth', () => {
  assert.deepEqual(RESERVED, ['index.md', 'log.md']);
  for (const p of ['index.md', 'phases/index.md', 'deep/nested/log.md']) {
    assert.equal(isReserved(p), true, p);
    assert.equal(typeForPath(p), null, p);
  }
});

test('non-md and backslash paths', () => {
  assert.equal(typeForPath('phases/phase-1/evidence/run.txt'), null);
  assert.equal(typeForPath('phases\\phase-2-npx-cli\\overview.md'), 'Phase');
});

test('decision pattern requires the NNNN- prefix', () => {
  assert.equal(typeForPath('decisions/0000-template.md'), 'Decision');
  assert.equal(typeForPath('decisions/notes.md'), 'Note');
});
