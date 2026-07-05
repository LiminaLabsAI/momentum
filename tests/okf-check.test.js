'use strict';

/**
 * Phase 24 G2 — `momentum okf check` / `momentum okf index` CLI surface
 * (bin/okf.js) + upgrade-path integration of the migration.
 */

const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, read, exists, runCli } = require('./_helpers');

test('okf check: conformant bundle exits 0 with the ✓ line', () => {
  const dir = mktmp('momentum-okf-cli-');
  try {
    write(path.join(dir, 'specs', 'index.md'), '---\nokf_version: "0.1"\n---\n\n# Specs\n');
    write(path.join(dir, 'specs', 'status.md'), '---\ntype: Status\n---\n\n# Status\n');
    const res = runCli(['okf', 'check', dir]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /✓ specs\/ is an OKF v0\.1 conformant bundle \(2 markdown file\(s\)\)/);
  } finally {
    rmrf(dir);
  }
});

test('okf check: violations exit 1 and are listed per file', () => {
  const dir = mktmp('momentum-okf-cli-bad-');
  try {
    write(path.join(dir, 'specs', 'status.md'), '# bare\n');
    const res = runCli(['okf', 'check', dir]);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /✗ status\.md — missing YAML frontmatter/);
    assert.match(res.stdout, /✗ 1 violation\(s\)/);
  } finally {
    rmrf(dir);
  }
});

test('okf check/index: no specs/ → exit 1 with a clear error', () => {
  const dir = mktmp('momentum-okf-cli-none-');
  try {
    for (const sub of ['check', 'index']) {
      const res = runCli(['okf', sub, dir]);
      assert.equal(res.status, 1, sub);
      assert.match(res.stderr, /no specs\/ directory/);
    }
  } finally {
    rmrf(dir);
  }
});

test('okf index: regenerates listings and is idempotent', () => {
  const dir = mktmp('momentum-okf-cli-idx-');
  try {
    write(path.join(dir, 'specs', 'status.md'), '---\ntype: Status\n---\n# S\n');
    write(path.join(dir, 'specs', 'phases', 'phase-1-x', 'overview.md'), '---\ntype: Phase\nstatus: planned\n---\n# P1\n');
    const first = runCli(['okf', 'index', dir]);
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /wrote specs\/index\.md/);
    assert.match(read(path.join(dir, 'specs', 'phases', 'index.md')), /phase-1-x.*planned/);
    const second = runCli(['okf', 'index', dir]);
    assert.equal(second.status, 0);
    assert.match(second.stdout, /= bundle indexes up to date/);
  } finally {
    rmrf(dir);
  }
});

test('okf help + unknown subcommand', () => {
  const help = runCli(['okf', 'help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /momentum okf check/);
  const bad = runCli(['okf', 'frobnicate']);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Unknown okf subcommand/);
});

test('upgrade runs the OKF migration: legacy JSON converted in place', () => {
  const dir = mktmp('momentum-okf-upgrade-');
  try {
    // Minimal momentum-ish project with legacy JSON state.
    write(path.join(dir, 'CLAUDE.md'), '# Project Rules: x\n\n## Project Extensions\n');
    write(path.join(dir, 'specs', 'status.md'), '# Status\n');
    write(path.join(dir, 'specs', 'phases', 'phase-1-a', 'overview.md'), '# P1\n');
    write(path.join(dir, 'specs', 'phases', 'index.json'), JSON.stringify({
      phases: { 'phase-1-a': { status: 'in-progress', topics: ['a'] } },
    }));
    write(path.join(dir, 'specs', 'decisions', 'impact-map.json'), JSON.stringify({
      topics: { a: { files: [{ path: 'specs/status.md', section: 'S' }] } },
    }));

    const res = runCli(['upgrade', dir], { timeout: 60000 });
    assert.equal(res.status, 0, res.stderr + res.stdout);
    assert.match(res.stdout, /Migrating specs\/ to the OKF bundle format/);
    assert.match(res.stdout, /index\.json distributed into 1 phase overview\.md file\(s\)/);
    assert.match(res.stdout, /impact-map\.json → decisions\/impact-map\.md/);
    assert.equal(exists(path.join(dir, 'specs', 'phases', 'index.json')), false);
    assert.equal(exists(path.join(dir, 'specs', 'decisions', 'impact-map.json')), false);
    assert.match(read(path.join(dir, 'specs', 'phases', 'phase-1-a', 'overview.md')), /^---\ntype: Phase\nstatus: in-progress/);

    // Post-upgrade the tree is conformant (upgrade itself swept frontmatter).
    const check = runCli(['okf', 'check', dir]);
    assert.equal(check.status, 0, check.stdout);

    // And a second upgrade reports no OKF changes (idempotent through the CLI).
    const again = runCli(['upgrade', dir], { timeout: 60000 });
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /= specs\/ is already an OKF bundle \(no changes\)/);
  } finally {
    rmrf(dir);
  }
});

test('upgrade --dry-run previews the migration without touching the JSON files', () => {
  const dir = mktmp('momentum-okf-upgrade-dry-');
  try {
    write(path.join(dir, 'CLAUDE.md'), '# Project Rules: x\n\n## Project Extensions\n');
    write(path.join(dir, 'specs', 'phases', 'index.json'), JSON.stringify({
      phases: { 'phase-1-a': { status: 'planned', topics: [] } },
    }));
    const res = runCli(['upgrade', dir, '--dry-run'], { timeout: 60000 });
    assert.equal(res.status, 0, res.stderr + res.stdout);
    assert.match(res.stdout, /Migrating specs\/ to the OKF bundle format/);
    assert.equal(exists(path.join(dir, 'specs', 'phases', 'index.json')), true, 'dry run leaves the JSON');
    assert.equal(exists(path.join(dir, 'specs', 'index.md')), false, 'dry run writes no indexes');
  } finally {
    rmrf(dir);
  }
});

test('fresh `momentum init` scaffolds a conformant OKF bundle (Phase 24 G3)', () => {
  const tmpRoot = mktmp('momentum-okf-init-');
  const dir = path.join(tmpRoot, 'fresh-project');
  require('node:fs').mkdirSync(dir);
  try {
    const res = runCli(['init', dir, '--agent', 'claude-code'], { timeout: 60000 });
    assert.equal(res.status, 0, res.stderr);
    assert.equal(exists(path.join(dir, 'specs', 'phases', 'index.json')), false, 'no legacy JSON in fresh scaffolds');
    assert.equal(exists(path.join(dir, 'specs', 'decisions', 'impact-map.json')), false);
    assert.match(read(path.join(dir, 'specs', 'index.md')), /^---\nokf_version: "0\.1"\n---\n/);
    assert.match(read(path.join(dir, 'specs', 'decisions', 'impact-map.md')), /type: Impact Map/);

    const check = runCli(['okf', 'check', dir]);
    assert.equal(check.status, 0, check.stdout);
    assert.match(check.stdout, /conformant bundle/);

    // The scaffolded indexes are exactly what `okf index` would regenerate —
    // template listings and the generator can never drift apart.
    const idx = runCli(['okf', 'index', dir]);
    assert.equal(idx.status, 0, idx.stderr);
    assert.match(idx.stdout, /= bundle indexes up to date/);
  } finally {
    rmrf(tmpRoot);
  }
});
