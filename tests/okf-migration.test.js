'use strict';

/**
 * Phase 24 G2 — OKF migration engine (core/lib/okf-migrate.js, ADR-0005).
 * Synthetic legacy project: index.json + impact-map.json + frontmatter-less
 * specs → migrate → conformant bundle, data-fidelity asserts, idempotency.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, read, exists } = require('./_helpers');

const okf = require('../core/lib/okf-migrate');
const fm = require('../core/lib/frontmatter');

const LEGACY_INDEX = {
  version: 1,
  description: 'legacy',
  phases: {
    'phase-1-core': { status: 'complete', topics: ['core', 'cli'] },
    'phase-2-api': { status: 'in-progress', topics: ['api'], deps: ['phase-1-core'] },
    'phase-3-ghost': { status: 'planned', topics: [] },
  },
};

const LEGACY_IMPACT = {
  version: 1,
  topics: {
    core: { files: [{ path: 'specs/status.md', section: 'Summary' }] },
    api: {
      files: [
        { path: 'specs/planning/roadmap.md', section: 'Timeline' },
        { path: 'README.md', section: 'Usage' },
      ],
    },
  },
};

function makeLegacyProject() {
  const dir = mktmp('momentum-okf-migrate-');
  write(path.join(dir, 'specs', 'status.md'), '# Project Status\n\nAll good.\n');
  write(path.join(dir, 'specs', 'backlog', 'backlog.md'), '# Backlog\n');
  write(path.join(dir, 'specs', 'planning', 'roadmap.md'), '# Roadmap\n');
  write(path.join(dir, 'specs', 'decisions', 'README.md'), '# Decisions\n');
  write(path.join(dir, 'specs', 'decisions', '0001-first.md'), '# ADR-0001: First Decision\n\nBody.\n');
  write(path.join(dir, 'specs', 'phases', 'phase-1-core', 'overview.md'), '# Phase 1 — Core\n\nGoal text.\n');
  write(path.join(dir, 'specs', 'phases', 'phase-1-core', 'tasks.md'), '# Tasks\n\n- [x] done\n');
  write(path.join(dir, 'specs', 'phases', 'phase-2-api', 'overview.md'), '# Phase 2 — API\n');
  // phase-3-ghost has NO directory — migration must not lose its data.
  write(path.join(dir, 'specs', 'phases', 'index.json'), JSON.stringify(LEGACY_INDEX, null, 2));
  write(path.join(dir, 'specs', 'decisions', 'impact-map.json'), JSON.stringify(LEGACY_IMPACT, null, 2));
  return dir;
}

test('migrate: distributes index.json with full data fidelity, converts impact-map, sweeps frontmatter, deletes JSON', () => {
  const dir = makeLegacyProject();
  try {
    const result = okf.migrate(dir);
    assert.equal(result.applicable, true);

    // JSON files gone.
    assert.equal(exists(path.join(dir, 'specs', 'phases', 'index.json')), false);
    assert.equal(exists(path.join(dir, 'specs', 'decisions', 'impact-map.json')), false);

    // Fidelity: every index.json entry survives as overview.md frontmatter.
    for (const [id, entry] of Object.entries(LEGACY_INDEX.phases)) {
      const { data, body } = fm.parse(read(path.join(dir, 'specs', 'phases', id, 'overview.md')));
      assert.ok(data, `${id} has parseable frontmatter`);
      assert.equal(data.type, 'Phase');
      assert.equal(data.status, entry.status, `${id} status preserved`);
      assert.deepEqual(data.tags || [], entry.topics, `${id} topics preserved as tags`);
      assert.deepEqual(data.deps || [], entry.deps || [], `${id} deps preserved`);
      assert.ok(body.length > 0);
    }
    // Body of an existing overview is byte-preserved after the block.
    const p1 = fm.parse(read(path.join(dir, 'specs', 'phases', 'phase-1-core', 'overview.md')));
    assert.equal(p1.body, '\n# Phase 1 — Core\n\nGoal text.\n');

    // Impact map: one row per (topic, file) pair.
    const impact = read(path.join(dir, 'specs', 'decisions', 'impact-map.md'));
    const parsedImpact = fm.parse(impact);
    assert.equal(parsedImpact.data.type, 'Impact Map');
    assert.match(impact, /\| core \| specs\/status\.md \| Summary \|/);
    assert.match(impact, /\| api \| specs\/planning\/roadmap\.md \| Timeline \|/);
    assert.match(impact, /\| api \| README\.md \| Usage \|/);

    // Sweep: plain files gained the right type.
    assert.equal(fm.parse(read(path.join(dir, 'specs', 'status.md'))).data.type, 'Status');
    assert.equal(fm.parse(read(path.join(dir, 'specs', 'decisions', '0001-first.md'))).data.type, 'Decision');
    assert.equal(fm.parse(read(path.join(dir, 'specs', 'decisions', 'README.md'))).data.type, 'Guide');
    assert.equal(fm.parse(read(path.join(dir, 'specs', 'phases', 'phase-1-core', 'tasks.md'))).data.type, 'Task List');

    // Indexes: root carries okf_version; listings exist and link.
    const root = read(path.join(dir, 'specs', 'index.md'));
    assert.match(root, /^---\nokf_version: "0\.1"\n---\n/);
    const phasesIdx = read(path.join(dir, 'specs', 'phases', 'index.md'));
    assert.equal(fm.hasBlock(phasesIdx), false, 'non-root index.md has no frontmatter');
    assert.match(phasesIdx, /\* \[phase-2-api\]\(\/phases\/phase-2-api\/overview\.md\) - in-progress/);
    const decIdx = read(path.join(dir, 'specs', 'decisions', 'index.md'));
    assert.match(decIdx, /\* \[ADR-0001: First Decision\]\(\/decisions\/0001-first\.md\)/);

    // The migrated tree passes the conformance check.
    const report = okf.check(dir);
    assert.deepEqual(report.violations, [], JSON.stringify(report.violations));
  } finally {
    rmrf(dir);
  }
});

test('migrate: idempotent — second run reports zero changes and leaves bytes identical', () => {
  const dir = makeLegacyProject();
  try {
    okf.migrate(dir);
    const snapshot = new Map();
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const abs = path.join(d, e.name);
        if (e.isDirectory()) walk(abs);
        else snapshot.set(abs, read(abs));
      }
    };
    walk(path.join(dir, 'specs'));

    const second = okf.migrate(dir);
    const changes = second.writes.length + second.converted.length + second.injected.length
      + second.deletes.length + second.indexes.length;
    assert.equal(changes, 0, `second run must be a no-op, got ${JSON.stringify(second, null, 2)}`);

    for (const [abs, before] of snapshot) {
      assert.equal(read(abs), before, `byte-stable: ${abs}`);
    }
  } finally {
    rmrf(dir);
  }
});

test('migrate: dry run writes nothing', () => {
  const dir = makeLegacyProject();
  try {
    const result = okf.migrate(dir, { dryRun: true });
    assert.ok(result.writes.length > 0);
    assert.ok(result.injected.length > 0);
    assert.equal(exists(path.join(dir, 'specs', 'phases', 'index.json')), true);
    assert.equal(exists(path.join(dir, 'specs', 'decisions', 'impact-map.json')), true);
    assert.equal(exists(path.join(dir, 'specs', 'index.md')), false);
    assert.equal(fm.hasBlock(read(path.join(dir, 'specs', 'status.md'))), false);
  } finally {
    rmrf(dir);
  }
});

test('migrate: existing frontmatter is preserved (swarm brief) and unparseable frontmatter is left alone', () => {
  const dir = mktmp('momentum-okf-preserve-');
  try {
    write(
      path.join(dir, 'specs', 'phases', 'phase-9-swarm', 'overview.md'),
      '---\nswarm: 0001-demo\nwave: 2\n---\n\n# Phase 9\n',
    );
    write(path.join(dir, 'specs', 'phases', 'index.json'), JSON.stringify({
      phases: { 'phase-9-swarm': { status: 'in-progress', topics: ['swarm'] } },
    }));
    write(path.join(dir, 'specs', 'planning', 'complex.md'), '---\nnested:\n  map: true\n---\nbody\n');

    const result = okf.migrate(dir);
    const { data } = fm.parse(read(path.join(dir, 'specs', 'phases', 'phase-9-swarm', 'overview.md')));
    assert.equal(data.swarm, '0001-demo', 'unknown key preserved');
    assert.equal(data.status, 'in-progress', 'status merged in');
    assert.equal(data.type, 'Phase');

    assert.equal(
      read(path.join(dir, 'specs', 'planning', 'complex.md')),
      '---\nnested:\n  map: true\n---\nbody\n',
      'outside-subset frontmatter untouched',
    );
    assert.ok(result.warnings.some((w) => w.includes('complex.md')), 'warned about the skipped file');
  } finally {
    rmrf(dir);
  }
});

test('migrate: no specs/ directory → not applicable, nothing created', () => {
  const dir = mktmp('momentum-okf-nospecs-');
  try {
    const result = okf.migrate(dir);
    assert.equal(result.applicable, false);
    assert.equal(exists(path.join(dir, 'specs')), false);
  } finally {
    rmrf(dir);
  }
});

test('check: flags missing frontmatter, empty type, and frontmatter on non-root index.md', () => {
  const dir = mktmp('momentum-okf-check-');
  try {
    write(path.join(dir, 'specs', 'status.md'), '# No frontmatter\n');
    write(path.join(dir, 'specs', 'planning', 'x.md'), '---\ntype:\n---\nbody\n');
    write(path.join(dir, 'specs', 'phases', 'index.md'), '---\nokf_version: "0.1"\n---\n# Listing\n');
    write(path.join(dir, 'specs', 'index.md'), '---\nokf_version: "0.1"\n---\n\n# Specs\n');

    const report = okf.check(dir);
    const problems = Object.fromEntries(report.violations.map((v) => [v.rel, v.problem]));
    assert.match(problems['status.md'], /missing YAML frontmatter/);
    assert.match(problems['planning/x.md'], /non-empty `type`/);
    assert.match(problems['phases/index.md'], /must not carry frontmatter/);
    assert.equal(report.violations.length, 3, 'root index.md frontmatter is legal');
  } finally {
    rmrf(dir);
  }
});
