'use strict';
// Phase 25 (ADR-0008): foundation docs are authored, not scaffolded.
// - init ships NO foundation placeholders; status.md carries the
//   "Not founded" router state.
// - upgrade removes provably-untouched legacy placeholders (normalized-body
//   hash ∈ core/foundation-placeholder-hashes.json) and reports; any edited
//   file survives; --dry-run previews; second run is a no-op.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { runCli, mktmp, read, write, exists } = require('./_helpers');

const FOUNDATION = [
  'specs/vision/project-charter.md',
  'specs/vision/principles.md',
  'specs/vision/success-criteria.md',
  'specs/planning/roadmap.md',
];
const FIXTURES = path.join(__dirname, 'fixtures', 'legacy-foundation-docs');
const FIXTURE_BY_REL = {
  'specs/vision/project-charter.md': 'project-charter.md',
  'specs/vision/principles.md': 'principles.md',
  'specs/vision/success-criteria.md': 'success-criteria.md',
  'specs/planning/roadmap.md': 'roadmap.md',
};

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function fixtureBody(rel) {
  return fs.readFileSync(path.join(FIXTURES, FIXTURE_BY_REL[rel]), 'utf8');
}

function plantLegacyDocs(target) {
  for (const rel of FOUNDATION) {
    write(path.join(target, rel), fixtureBody(rel));
  }
}

// Mirrors the normalization contract in bin/momentum.js::migrateFoundationDocs
// and core/foundation-placeholder-hashes.json.
function normalizedHash(content) {
  let body = content.replace(/\r\n/g, '\n');
  body = body.replace(/^---\n[\s\S]*?\n---\n/, '');
  body = body.trim() + '\n';
  return crypto.createHash('sha256').update(body).digest('hex');
}

// ── Manifest ↔ fixture integrity ────────────────────────────────────────────

test('frozen hash manifest covers every legacy fixture body (and only real paths)', () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '..', 'core', 'foundation-placeholder-hashes.json'),
      'utf8'
    )
  );
  assert.deepEqual(Object.keys(manifest.paths).sort(), [...FOUNDATION].sort());
  for (const rel of FOUNDATION) {
    const h = normalizedHash(fixtureBody(rel));
    assert.ok(
      manifest.paths[rel].includes(h),
      `${rel}: fixture hash ${h} missing from frozen manifest`
    );
  }
});

// ── Init shape: no placeholders, Not-founded status ─────────────────────────

for (const agent of ['claude-code', 'codex', 'antigravity', 'opencode']) {
  test(`init --agent ${agent}: no foundation placeholders; status.md routes to founding`, () => {
    const target = mktmp();
    try {
      const res = runCli(['init', target, '--agent', agent]);
      assert.equal(res.status, 0, `init failed: ${res.stderr}`);
      for (const rel of FOUNDATION) {
        assert.ok(!exists(path.join(target, rel)), `${rel} must NOT ship at init`);
      }
      // absence extends to the dirs — they appear at founding
      assert.ok(!exists(path.join(target, 'specs', 'vision')), 'specs/vision must not ship at init');
      const status = read(path.join(target, 'specs', 'status.md'));
      assert.match(status, /Not founded/);
      assert.match(status, /\/start-project/);
    } finally {
      rmrf(target);
    }
  });
}

test('init success message routes through founding', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /Found the project/);
    assert.match(res.stdout, /\/start-project/);
  } finally {
    rmrf(target);
  }
});

// ── Upgrade migration: legacy placeholder removal ───────────────────────────

test('upgrade removes all four untouched legacy placeholders and reports not-founded', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    plantLegacyDocs(target);
    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, `upgrade failed: ${res.stderr}`);
    for (const rel of FOUNDATION) {
      assert.ok(!exists(path.join(target, rel)), `${rel} should have been removed`);
    }
    assert.match(res.stdout, /not yet founded/);
    assert.match(res.stdout, /foundation docs:\s+removed 4 untouched placeholder/);
  } finally {
    rmrf(target);
  }
});

test('upgrade keeps an edited (authored) foundation doc, removes the untouched rest', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    plantLegacyDocs(target);
    const charter = path.join(target, 'specs/vision/project-charter.md');
    write(charter, read(charter) + '\nOur users are night-shift nurses.\n');
    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, res.stderr);
    assert.ok(exists(charter), 'edited charter must survive');
    assert.match(read(charter), /night-shift nurses/);
    for (const rel of FOUNDATION.filter((r) => !r.includes('project-charter'))) {
      assert.ok(!exists(path.join(target, rel)), `${rel} should have been removed`);
    }
    assert.match(res.stdout, /removed 3 untouched placeholder/);
  } finally {
    rmrf(target);
  }
});

test('pre-OKF legacy placeholder (no frontmatter) is removed — in-flight OKF frontmatter injection cannot defeat the match', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    // Simulate a pre-v0.27.0 install: same bodies, no YAML frontmatter.
    for (const rel of FOUNDATION) {
      const stripped = fixtureBody(rel).replace(/^---\n[\s\S]*?\n---\n/, '');
      write(path.join(target, rel), stripped);
    }
    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, res.stderr);
    for (const rel of FOUNDATION) {
      assert.ok(!exists(path.join(target, rel)), `${rel} should have been removed (pre-OKF variant)`);
    }
  } finally {
    rmrf(target);
  }
});

test('upgrade --dry-run previews placeholder removal without deleting', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    plantLegacyDocs(target);
    const res = runCli(['upgrade', target, '--dry-run']);
    assert.equal(res.status, 0, res.stderr);
    for (const rel of FOUNDATION) {
      assert.ok(exists(path.join(target, rel)), `${rel} must still exist after --dry-run`);
    }
    assert.match(res.stdout, /would remove: specs\/vision\/project-charter\.md/);
  } finally {
    rmrf(target);
  }
});

test('upgrade is idempotent — second run finds no placeholders', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    plantLegacyDocs(target);
    runCli(['upgrade', target]);
    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /no untouched placeholders/);
    assert.doesNotMatch(res.stdout, /foundation docs:\s+removed/);
  } finally {
    rmrf(target);
  }
});

test('upgrade never touches authored foundation docs (founded project)', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    const authored = {
      'specs/vision/project-charter.md': '---\ntype: Vision\n---\n\n# Project Charter\n\nReal charter for a real product.\n',
      'specs/planning/roadmap.md': '---\ntype: Roadmap\n---\n\n# Roadmap\n\n| Phase | Name |\n|---|---|\n| 0 | Bootstrap |\n',
    };
    for (const [rel, content] of Object.entries(authored)) {
      write(path.join(target, rel), content);
    }
    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, res.stderr);
    for (const [rel, content] of Object.entries(authored)) {
      assert.ok(exists(path.join(target, rel)), `${rel} must survive`);
      // OKF migration may not touch these (frontmatter already present)
      assert.equal(read(path.join(target, rel)), content, `${rel} must be byte-identical`);
    }
  } finally {
    rmrf(target);
  }
});
