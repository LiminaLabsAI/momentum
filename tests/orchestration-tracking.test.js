'use strict';

/**
 * Phase 11 G4 — tracking contract integration.
 *
 * Verifies the meaningful-only rule: cheap layer (session log + run
 * artifact + handoff inbox) is always auto; curated layer (history.md
 * + backlog.md) is auto only when Rule 3 criteria are met. No new
 * entry types — [DISCOVERY] / [DECISION] / [NOTE] only.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf } = require('./_helpers');
const tracking = require('../core/orchestration/tracking');
const scoutLib = require('../core/orchestration/scout');
const dispatchLib = require('../core/orchestration/dispatch');

function mkRepoWithPhase(tmp, name, phaseName = 'phase-1-foo') {
  const repo = path.join(tmp, name);
  fs.mkdirSync(path.join(repo, 'specs', 'phases', phaseName), { recursive: true });
  fs.writeFileSync(
    path.join(repo, 'specs', 'phases', phaseName, 'history.md'),
    `# ${phaseName} history\n\n## Entries\n`,
  );
  fs.writeFileSync(path.join(repo, 'README.md'), `# ${name}\n`);
  return repo;
}

// ── isMeaningfulFinding ─────────────────────────────────────────────────────

test('isMeaningfulFinding requires title + (type or priority)', () => {
  assert.strictEqual(tracking.isMeaningfulFinding(null), false);
  assert.strictEqual(tracking.isMeaningfulFinding({}), false);
  assert.strictEqual(tracking.isMeaningfulFinding({ title: '' }), false);
  assert.strictEqual(tracking.isMeaningfulFinding({ title: 'just a note' }), false);
  assert.strictEqual(
    tracking.isMeaningfulFinding({ title: 'real bug', recommendedBacklogType: 'bug' }),
    true,
  );
  assert.strictEqual(
    tracking.isMeaningfulFinding({ title: 'priority only', recommendedBacklogPriority: 'P1' }),
    true,
  );
  assert.strictEqual(
    tracking.isMeaningfulFinding({ title: 'invalid type', recommendedBacklogType: 'made-up' }),
    false,
  );
});

// ── proposeDiscovery ────────────────────────────────────────────────────────

test('proposeDiscovery writes [DISCOVERY] when finding is meaningful + active phase exists', () => {
  const tmp = mktmp('track-discovery-yes-');
  try {
    const repo = mkRepoWithPhase(tmp, 'r');
    const result = tracking.proposeDiscovery({
      primitive: 'scout',
      targetRepo: repo,
      finding: {
        title: 'Stale doc reference',
        detail: 'README links to old URL',
        recommendedBacklogType: 'tech-debt',
        recommendedBacklogPriority: 'P3',
      },
    });
    assert.strictEqual(result.shouldWrite, true);
    const history = fs.readFileSync(result.historyPath, 'utf8');
    assert.match(history, /\[DISCOVERY\] \d{4}-\d{2}-\d{2} — Stale doc reference/);
    assert.match(history, /Topics: orchestration, scout, discovery, tech-debt/);
    assert.match(history, /Detail: README links to old URL \(backlog candidate: tech-debt \/ P3\)/);
  } finally {
    rmrf(tmp);
  }
});

test('proposeDiscovery does NOT write when finding lacks Rule 3 criteria', () => {
  const tmp = mktmp('track-discovery-no-');
  try {
    const repo = mkRepoWithPhase(tmp, 'r');
    const result = tracking.proposeDiscovery({
      primitive: 'scout',
      targetRepo: repo,
      finding: { title: 'just informational', detail: 'context only' },
    });
    assert.strictEqual(result.shouldWrite, false);
    assert.match(result.reason, /not meaningful per Rule 3/);
    const history = fs.readFileSync(path.join(repo, 'specs', 'phases', 'phase-1-foo', 'history.md'), 'utf8');
    assert.doesNotMatch(history, /\[DISCOVERY\]/);
  } finally {
    rmrf(tmp);
  }
});

test('proposeDiscovery returns no-write when target repo has no active phase', () => {
  const tmp = mktmp('track-no-phase-');
  try {
    const repo = path.join(tmp, 'r');
    fs.mkdirSync(repo, { recursive: true });
    const result = tracking.proposeDiscovery({
      primitive: 'scout',
      targetRepo: repo,
      finding: { title: 'real bug', recommendedBacklogType: 'bug' },
    });
    assert.strictEqual(result.shouldWrite, false);
    assert.match(result.reason, /no active phase/);
  } finally {
    rmrf(tmp);
  }
});

// ── proposeHistoryNote ──────────────────────────────────────────────────────

test('proposeHistoryNote writes [NOTE] in originating active phase history', () => {
  const tmp = mktmp('track-note-yes-');
  try {
    const repo = mkRepoWithPhase(tmp, 'r');
    const result = tracking.proposeHistoryNote({
      primitive: 'dispatch',
      originatingRepo: repo,
      message: 'audit confirms safe rename across 4 repos',
      runArtifactRef: '.momentum/runs/dispatch-042.md',
    });
    assert.strictEqual(result.shouldWrite, true);
    const history = fs.readFileSync(result.historyPath, 'utf8');
    assert.match(history, /\[NOTE\] \d{4}-\d{2}-\d{2} — dispatch synthesis/);
    assert.match(history, /Topics: orchestration, dispatch, synthesis/);
    assert.match(history, /Affects-specs: \.momentum\/runs\/dispatch-042\.md/);
    assert.match(history, /Detail: audit confirms safe rename across 4 repos/);
  } finally {
    rmrf(tmp);
  }
});

test('proposeHistoryNote rejects empty/whitespace messages', () => {
  const tmp = mktmp('track-note-empty-');
  try {
    const repo = mkRepoWithPhase(tmp, 'r');
    const r1 = tracking.proposeHistoryNote({
      primitive: 'dispatch',
      originatingRepo: repo,
      message: '',
    });
    assert.strictEqual(r1.shouldWrite, false);
    const r2 = tracking.proposeHistoryNote({
      primitive: 'dispatch',
      originatingRepo: repo,
      message: '   ',
    });
    assert.strictEqual(r2.shouldWrite, false);
  } finally {
    rmrf(tmp);
  }
});

// ── End-to-end via scout.record ────────────────────────────────────────────

test('scout.record() with meaningful finding → [DISCOVERY] in scouted repo history', () => {
  const tmp = mktmp('track-scout-record-');
  try {
    const ecoRoot = path.join(tmp, 'eco');
    fs.mkdirSync(ecoRoot, { recursive: true });
    fs.writeFileSync(path.join(ecoRoot, 'ecosystem.json'), JSON.stringify({
      name: 'eco', version: 1, members: [
        { id: 'a', path: 'a', role: 'other' },
        { id: 'b', path: 'b', role: 'other' },
      ],
    }, null, 2));
    const a = mkRepoWithPhase(ecoRoot, 'a');
    const b = mkRepoWithPhase(ecoRoot, 'b');

    scoutLib.record({
      repo: b,
      prompt: 'auth shape',
      summary: 'auth uses X-Cerebrio-Auth header',
      filesRead: ['specs/status.md'],
      findings: [
        { title: 'Header literal hard-coded in 3 tests', recommendedBacklogType: 'tech-debt', recommendedBacklogPriority: 'P2' },
        { title: 'Informational note', detail: 'just context' }, // NOT meaningful
      ],
      originatingRepo: a,
      ecosystem: { rootPath: ecoRoot, memberId: 'a' },
      duration: 11,
    });

    const bHistory = fs.readFileSync(path.join(b, 'specs', 'phases', 'phase-1-foo', 'history.md'), 'utf8');
    assert.match(bHistory, /\[DISCOVERY\] .* Header literal hard-coded in 3 tests/);
    assert.doesNotMatch(bHistory, /Informational note/);
    // Originating repo should not get an entry on scout (only [DISCOVERY]
    // lands in the SCOUTED repo).
    const aHistory = fs.readFileSync(path.join(a, 'specs', 'phases', 'phase-1-foo', 'history.md'), 'utf8');
    assert.doesNotMatch(aHistory, /\[DISCOVERY\]/);
  } finally {
    rmrf(tmp);
  }
});

// ── End-to-end via dispatch.record ─────────────────────────────────────────

test('dispatch.record() distributes findings per-repo + writes [NOTE] in originating', () => {
  const tmp = mktmp('track-dispatch-record-');
  try {
    const ecoRoot = path.join(tmp, 'eco');
    fs.mkdirSync(ecoRoot, { recursive: true });
    fs.writeFileSync(path.join(ecoRoot, 'ecosystem.json'), JSON.stringify({
      name: 'eco', version: 1, members: [
        { id: 'a', path: 'a', role: 'other' },
        { id: 'b', path: 'b', role: 'other' },
        { id: 'c', path: 'c', role: 'other' },
      ],
    }, null, 2));
    const a = mkRepoWithPhase(ecoRoot, 'a');
    const b = mkRepoWithPhase(ecoRoot, 'b');
    const c = mkRepoWithPhase(ecoRoot, 'c');

    dispatchLib.record({
      repos: [a, b, c],
      userIntent: 'audit auth header',
      mode: 'parallel',
      modeNotes: [],
      perRepoResults: [
        { repo: a, prompt: 'p', summary: 'A summary', findings: [
          { title: 'A bug', recommendedBacklogType: 'bug', recommendedBacklogPriority: 'P1' },
        ], filesRead: [], duration: 5 },
        { repo: b, prompt: 'p', summary: 'B summary clean', findings: [], filesRead: [], duration: 5 },
        { repo: c, prompt: 'p', summary: 'C summary', findings: [
          { title: 'C tech debt', recommendedBacklogType: 'tech-debt', recommendedBacklogPriority: 'P3' },
          { title: 'C random note' }, // NOT meaningful
        ], filesRead: [], duration: 6 },
      ],
      failures: [],
      synthesis: 'cross-repo audit synthesis',
      originatingRepo: a,
      ecosystem: { rootPath: ecoRoot, memberId: 'a' },
      duration: 20,
    });

    const aHistory = fs.readFileSync(path.join(a, 'specs', 'phases', 'phase-1-foo', 'history.md'), 'utf8');
    const bHistory = fs.readFileSync(path.join(b, 'specs', 'phases', 'phase-1-foo', 'history.md'), 'utf8');
    const cHistory = fs.readFileSync(path.join(c, 'specs', 'phases', 'phase-1-foo', 'history.md'), 'utf8');

    // A has its [DISCOVERY] for "A bug" AND a [NOTE] from synthesis.
    assert.match(aHistory, /\[DISCOVERY\] .* A bug/);
    assert.match(aHistory, /\[NOTE\] .* dispatch synthesis/);

    // B has nothing (no meaningful findings).
    assert.doesNotMatch(bHistory, /\[DISCOVERY\]/);
    assert.doesNotMatch(bHistory, /\[NOTE\]/);

    // C has its tech-debt [DISCOVERY] but NOT the unrated "random note".
    assert.match(cHistory, /\[DISCOVERY\] .* C tech debt/);
    assert.doesNotMatch(cHistory, /random note/);

    // No new entry types anywhere.
    for (const h of [aHistory, bHistory, cHistory]) {
      assert.doesNotMatch(h, /\[SCOUT\]/);
      assert.doesNotMatch(h, /\[DISPATCH\]/);
      assert.doesNotMatch(h, /\[HANDOFF\]/);
    }
  } finally {
    rmrf(tmp);
  }
});

test('full integration: scout + dispatch + handoff produce NO new entry types in any history', async () => {
  const tmp = mktmp('track-no-new-types-');
  try {
    const ecoRoot = path.join(tmp, 'eco');
    fs.mkdirSync(ecoRoot, { recursive: true });
    fs.writeFileSync(path.join(ecoRoot, 'ecosystem.json'), JSON.stringify({
      name: 'eco', version: 1, members: [
        { id: 'a', path: 'a', role: 'other' },
        { id: 'b', path: 'b', role: 'other' },
      ],
    }, null, 2));
    const a = mkRepoWithPhase(ecoRoot, 'a');
    const b = mkRepoWithPhase(ecoRoot, 'b');

    // scout
    await scoutLib.scout({
      repo: b,
      prompt: 'auth',
      originatingRepo: a,
      ecosystem: { rootPath: ecoRoot, memberId: 'a' },
      silent: true,
    });
    // dispatch
    await dispatchLib.dispatch({
      repos: [a, b],
      userIntent: 'check',
      originatingRepo: a,
      ecosystem: { rootPath: ecoRoot, memberId: 'a' },
      silent: true,
    });
    // handoff
    const handoffLib = require('../core/orchestration/handoff');
    await handoffLib.handoff({
      fromRepo: a, toRepo: b,
      summary: 'continue',
      ecosystem: { rootPath: ecoRoot, memberId: 'a' },
      silent: true,
    });

    for (const repo of [a, b]) {
      const h = fs.readFileSync(path.join(repo, 'specs', 'phases', 'phase-1-foo', 'history.md'), 'utf8');
      assert.doesNotMatch(h, /\[SCOUT\]/, `${repo} must not contain [SCOUT]`);
      assert.doesNotMatch(h, /\[DISPATCH\]/, `${repo} must not contain [DISPATCH]`);
      assert.doesNotMatch(h, /\[HANDOFF\]/, `${repo} must not contain [HANDOFF]`);
    }
  } finally {
    rmrf(tmp);
  }
});
