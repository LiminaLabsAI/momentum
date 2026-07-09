'use strict';

/**
 * Phase 26 — Project Config, Group 0.
 *
 * Unit tests for the config core library (core/config.js) + the
 * markdown renderer (core/config-templates.js). Covers the reader
 * (valid/empty/missing/unknown-value-fails-closed), writer (round-trip),
 * pure inference helpers (language/forge/framework/commands), the fs-bound
 * inferConfig against real tmp dirs, deriveProtectedBranches, the cache
 * read/write, and the founded predicate.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const P = require('../core/config');
const { renderConfigMarkdown } = require('../core/config-templates');
const { mktmp, rmrf } = require('./_helpers');

function writeTmpPrefs(specsDir, md) {
  fs.mkdirSync(specsDir, { recursive: true });
  fs.writeFileSync(path.join(specsDir, 'config.md'), md);
}

// ── parseConfigMarkdown ──────────────────────────────────────────────────

test('parseConfigMarkdown: extracts known scalar + list keys', () => {
  const md = renderConfigMarkdown({
    language: 'python', framework: 'fastapi', test_command: 'pytest',
    build_command: 'none', publish_target: 'pypi', git_forge: 'gitlab',
    release_command: 'glab release create', release_flow: 'tag-and-publish',
    end_state: 'merge-after-yes', branch_flow: ['main'], protected_branches: ['main'],
  });
  const raw = P.parseConfigMarkdown(md);
  assert.equal(raw.language, 'python');
  assert.equal(raw.git_forge, 'gitlab');
  assert.deepEqual(raw.branch_flow, ['main']);
  assert.deepEqual(raw.protected_branches, ['main']);
});

test('parseConfigMarkdown: empty / table-less content → {}', () => {
  assert.deepEqual(P.parseConfigMarkdown(''), {});
  assert.deepEqual(P.parseConfigMarkdown('# Project Config\n\nNo table here.\n'), {});
});

test('parseConfigMarkdown: ignores unknown keys + header/separator rows', () => {
  const md = [
    '| Key | Value |',
    '|-----|-------|',
    '| language | rust |',
    '| favorite_color | blue |',
    '| build_command | cargo build --release |',
  ].join('\n');
  const raw = P.parseConfigMarkdown(md);
  assert.equal(raw.language, 'rust');
  assert.equal(raw.build_command, 'cargo build --release');
  assert.equal(raw.favorite_color, undefined, 'unknown key ignored');
});

test('parseConfigMarkdown: list values split on comma + trimmed', () => {
  const raw = P.parseConfigMarkdown('| branch_flow | uat, staging ,  main |');
  assert.deepEqual(raw.branch_flow, ['uat', 'staging', 'main']);
});

// ── normalizeConfig (fail-closed) ────────────────────────────────────────

test('normalizeConfig: fills every default for an empty map', () => {
  const prefs = P.normalizeConfig({});
  for (const k of P.KNOWN_KEYS) assert.ok(k in prefs, `missing ${k}`);
  assert.equal(prefs.git_forge, 'github');
  assert.equal(prefs.end_state, 'merge-after-yes');
  assert.deepEqual(prefs.branch_flow, ['staging', 'main']);
});

test('normalizeConfig: unknown enum value → default (no throw)', () => {
  const prefs = P.normalizeConfig({ git_forge: 'sourceforge', end_state: 'ship-it' });
  assert.equal(prefs.git_forge, 'github');
  assert.equal(prefs.end_state, 'merge-after-yes');
});

test('normalizeConfig: string list key coerced to array', () => {
  const prefs = P.normalizeConfig({ branch_flow: 'main' });
  assert.deepEqual(prefs.branch_flow, ['main']);
});

test('normalizeConfig: round-trips a valid set unchanged', () => {
  const orig = {
    language: 'rust', framework: 'actix', test_command: 'cargo test',
    build_command: 'cargo build --release', publish_target: 'crates-io',
    git_forge: 'github', release_command: 'gh release create',
    release_flow: 'tag-and-publish', end_state: 'feature-branch-only',
    branch_flow: ['main'], protected_branches: ['main'],
  };
  assert.deepEqual(P.normalizeConfig(orig), orig);
});

// ── readConfig ───────────────────────────────────────────────────────────

test('readConfig: missing file → null', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    assert.equal(P.readConfig(tmp), null);
  } finally { rmrf(tmp); }
});

test('readConfig: valid file → normalized object', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    writeTmpPrefs(tmp, renderConfigMarkdown({
      language: 'go', framework: 'none', test_command: 'go test ./...',
      build_command: 'go build', publish_target: 'none', git_forge: 'gitea',
      release_command: 'tea release create', release_flow: 'tag-only',
      end_state: 'feature-branch-only', branch_flow: ['main'], protected_branches: ['main'],
    }));
    const prefs = P.readConfig(tmp);
    assert.equal(prefs.language, 'go');
    assert.equal(prefs.git_forge, 'gitea');
    assert.equal(prefs.end_state, 'feature-branch-only');
    assert.deepEqual(prefs.protected_branches, ['main']);
  } finally { rmrf(tmp); }
});

// ── writeConfig (round-trip) ─────────────────────────────────────────────

test('writeConfig: writes a file readConfig parses back', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    const orig = P.inferConfig(tmp, { remoteUrl: 'git@gitlab.com:org/repo.git' });
    P.writeConfig(tmp, orig, { inferred: true });
    const back = P.readConfig(tmp);
    assert.equal(back.language, orig.language);
    assert.equal(back.git_forge, 'gitlab');
    assert.equal(back.release_command, 'glab release create');
    assert.deepEqual(back.branch_flow, orig.branch_flow);
    // frontmatter type line present
    const body = fs.readFileSync(path.join(tmp, 'config.md'), 'utf8');
    assert.match(body, /^type: Config$/m);
  } finally { rmrf(tmp); }
});

// ── inferLanguage ─────────────────────────────────────────────────────────────

test('inferLanguage: node from package.json', () => {
  assert.equal(P.inferLanguage({ packageJson: true }), 'node');
  assert.equal(P.inferLanguage({ pyproject: true }), 'python');
  assert.equal(P.inferLanguage({ setupPy: true }), 'python');
  assert.equal(P.inferLanguage({ cargo: true }), 'rust');
  assert.equal(P.inferLanguage({ goMod: true }), 'go');
  assert.equal(P.inferLanguage({ csproj: true }), 'dotnet');
  assert.equal(P.inferLanguage({ gemfile: true }), 'ruby');
  assert.equal(P.inferLanguage({ pom: true }), 'java');
  assert.equal(P.inferLanguage({ gradle: true }), 'java');
  assert.equal(P.inferLanguage({}), 'none');
});

// ── inferForge ────────────────────────────────────────────────────────────────

test('inferForge: recognizes the major forges + falls back to github', () => {
  assert.equal(P.inferForge('git@github.com:org/repo.git'), 'github');
  assert.equal(P.inferForge('https://gitlab.com/org/repo.git'), 'gitlab');
  assert.equal(P.inferForge('git@bitbucket.org:org/repo.git'), 'bitbucket');
  assert.equal(P.inferForge('https://gitea.example.com/org/repo'), 'gitea');
  assert.equal(P.inferForge('https://codeberg.org/forgejo/forgejo'), 'gitea'); // Codeberg is a Gitea instance
  assert.equal(P.inferForge('git@git.internal.local:org/repo.git'), 'bare-ssh');
  assert.equal(P.inferForge(''), 'github');
  assert.equal(P.inferForge('https://unknown.example.com/repo'), 'github');
});

// ── inferFramework ────────────────────────────────────────────────────────────

test('inferFramework: node/next/astro/express by deps; python + rust reachable by language', () => {
  assert.equal(P.inferFramework('node', { dependencies: { next: '^14' } }), 'nextjs');
  assert.equal(P.inferFramework('node', { dependencies: { astro: '^4' } }), 'astro');
  assert.equal(P.inferFramework('node', { dependencies: { express: '^4' } }), 'express');
  assert.equal(P.inferFramework('python', { dependencies: { fastapi: '^0.110' } }), 'fastapi');
  assert.equal(P.inferFramework('python', { dependencies: { django: '^5' } }), 'django');
  assert.equal(P.inferFramework('rust', { dependencies: { actix_web: '^0.13' } }), 'actix');
  assert.equal(P.inferFramework('rust', { dependencies: { axum: '^0.7' } }), 'axum');
  assert.equal(P.inferFramework('node', {}), 'none');
  assert.equal(P.inferFramework('go', {}), 'none');
});

// ── inferCommands ─────────────────────────────────────────────────────────────

test('inferCommands: node → npm test/build/publish', () => {
  const c = P.inferCommands('node', { scripts: { build: 'astro build' } });
  assert.equal(c.test_command, 'npm test');
  assert.equal(c.build_command, 'npm run build');
  assert.equal(c.publish_target, 'npm');
  assert.equal(c.release_flow, 'tag-and-publish');
});

test('inferCommands: node without build script → build none', () => {
  const c = P.inferCommands('node', { scripts: {} });
  assert.equal(c.build_command, 'none');
});

test('inferCommands: python/rust/go/dotnet/unknown', () => {
  assert.equal(P.inferCommands('python').publish_target, 'pypi');
  assert.equal(P.inferCommands('rust').build_command, 'cargo build --release');
  assert.equal(P.inferCommands('go').publish_target, 'none');
  assert.equal(P.inferCommands('dotnet').publish_target, 'nuget');
  assert.equal(P.inferCommands('none').test_command, 'npm test');
});

// ── inferConfig (fs-bound, real tmp dirs) ────────────────────────────────

test('inferConfig: node project with build script + github remote', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      name: 'demo', scripts: { test: 'node --test', build: 'astro build' },
    }));
    const prefs = P.inferConfig(tmp, { remoteUrl: 'git@github.com:org/demo.git' });
    assert.equal(prefs.language, 'node');
    assert.equal(prefs.build_command, 'npm run build');
    assert.equal(prefs.publish_target, 'npm');
    assert.equal(prefs.git_forge, 'github');
    assert.equal(prefs.release_command, 'gh release create');
    assert.equal(prefs.release_flow, 'tag-and-publish');
    assert.deepEqual(prefs.protected_branches, ['staging', 'main']);
  } finally { rmrf(tmp); }
});

test('inferConfig: python project on gitlab', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    fs.writeFileSync(path.join(tmp, 'pyproject.toml'), '[project]\nname = "demo"\n');
    const prefs = P.inferConfig(tmp, { remoteUrl: 'https://gitlab.com/org/demo.git' });
    assert.equal(prefs.language, 'python');
    assert.equal(prefs.test_command, 'pytest');
    assert.equal(prefs.publish_target, 'pypi');
    assert.equal(prefs.git_forge, 'gitlab');
    assert.equal(prefs.release_command, 'glab release create');
  } finally { rmrf(tmp); }
});

test('inferConfig: rust project, no remote → bare-ssh-ish fallback stays github default', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    fs.writeFileSync(path.join(tmp, 'Cargo.toml'), '[package]\nname = "demo"\n');
    const prefs = P.inferConfig(tmp, { remoteUrl: '' });
    assert.equal(prefs.language, 'rust');
    assert.equal(prefs.publish_target, 'crates-io');
    assert.equal(prefs.git_forge, 'github');
  } finally { rmrf(tmp); }
});

test('inferConfig: no manifest → language none, defaults', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    const prefs = P.inferConfig(tmp, { remoteUrl: 'git@github.com:org/repo.git' });
    assert.equal(prefs.language, 'none');
    assert.equal(prefs.test_command, 'npm test');
    assert.equal(prefs.publish_target, 'none');
  } finally { rmrf(tmp); }
});

// ── deriveProtectedBranches ───────────────────────────────────────────────────

test('deriveProtectedBranches: returns the flow verbatim', () => {
  assert.deepEqual(P.deriveProtectedBranches(['uat', 'staging', 'main']), ['uat', 'staging', 'main']);
});

test('deriveProtectedBranches: empty/non-array → default', () => {
  assert.deepEqual(P.deriveProtectedBranches([]), P.DEFAULTS.protected_branches);
  assert.deepEqual(P.deriveProtectedBranches(null), P.DEFAULTS.protected_branches);
});

// ── cache read/write ──────────────────────────────────────────────────────────

test('writeConfigCache + readConfigCache: round-trip', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    const prefs = { protected_branches: ['main'], branch_flow: ['main'], end_state: 'feature-branch-only' };
    P.writeConfigCache(tmp, prefs);
    const cache = P.readConfigCache(tmp);
    assert.deepEqual(cache.protected_branches, ['main']);
    assert.equal(cache.end_state, 'feature-branch-only');
    assert.equal(cache.version, 1);
  } finally { rmrf(tmp); }
});

test('readConfigCache: missing → null', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    assert.equal(P.readConfigCache(tmp), null);
  } finally { rmrf(tmp); }
});

// ── isFounded (ADR-0008 predicate) ────────────────────────────────────────────

test('isFounded: charter + roadmap → true; one or none → false', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    assert.equal(P.isFounded(tmp), false);
    fs.mkdirSync(path.join(tmp, 'specs', 'vision'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'specs', 'planning'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'specs', 'vision', 'project-charter.md'), '# charter\n');
    assert.equal(P.isFounded(tmp), false, 'roadmap missing → not founded');
    fs.writeFileSync(path.join(tmp, 'specs', 'planning', 'roadmap.md'), '# roadmap\n');
    assert.equal(P.isFounded(tmp), true);
  } finally { rmrf(tmp); }
});

// ── review-finding regression tests ──────────────────────────────────────────

test('inferLanguage: dual manifest node+pyproject → node wins (priority)', () => {
  // A repo can legitimately carry both a package.json and a pyproject.toml;
  // node must win so the CLI does not mis-detect a python project.
  assert.equal(P.inferLanguage({ packageJson: true, pyproject: true }), 'node');
  assert.equal(P.inferLanguage({ packageJson: true, setupPy: true, cargo: true }), 'node');
});

test('normalizeConfig: unknown enum → default for language / publish_target / release_flow', () => {
  // M2 — the fail-closed path advertised in the header, asserted for the
  // values most likely hand-mis-typed in specs/config.md.
  assert.equal(P.normalizeConfig({ language: 'cobol' }).language, 'none');
  assert.equal(P.normalizeConfig({ publish_target: 'npm2' }).publish_target, 'none');
  assert.equal(P.normalizeConfig({ release_flow: 'ship-it' }).release_flow, 'tag-only');
});

test('normalizeConfig: unknown value emits stderr warning when opts.warn', () => {
  // M5 — the advertised "resolves to default WITH a stderr warning".
  const chunks = [];
  const orig = process.stderr.write;
  process.stderr.write = (c) => { chunks.push(String(c)); return true; };
  try {
    const out = P.normalizeConfig({ git_forge: 'bogus' }, { warn: true });
    assert.equal(out.git_forge, 'github');
    assert.ok(chunks.join('').includes("unknown 'git_forge' value 'bogus'"), 'stderr warned');
  } finally {
    process.stderr.write = orig;
  }
});

test('inferCommands: node test_command is always npm test (no dead branch)', () => {
  // M3 — scripts.test presence must not change the resolved command.
  assert.equal(P.inferCommands('node', { scripts: { test: 'jest' } }).test_command, 'npm test');
  assert.equal(P.inferCommands('node', { scripts: {} }).test_command, 'npm test');
});

test('writeConfigCache: protected_branches DERIVED from branch_flow, extras unioned (I3)', () => {
  // ADR-0009: protected_branches is derived from branch_flow; an explicit
  // extra branch is added on top, but the flow is always authoritative.
  const tmp = mktmp('momentum-prefs-');
  try {
    P.writeConfigCache(tmp, { branch_flow: ['staging', 'main'], protected_branches: ['main', 'release'] });
    const cache = P.readConfigCache(tmp);
    assert.deepEqual(cache.protected_branches, ['staging', 'main', 'release']);
  } finally { rmrf(tmp); }
});

test('writeConfigCache: empty protected_branches → derives from flow only', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    P.writeConfigCache(tmp, { branch_flow: ['uat', 'main'], protected_branches: [] });
    const cache = P.readConfigCache(tmp);
    assert.deepEqual(cache.protected_branches, ['uat', 'main']);
  } finally { rmrf(tmp); }
});

// ── ENH-062: drift detection + approval-gated apply ──────────────────────────

test('diffConfig: flags inferable drift, never flags user-authored fields', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    const specsDir = path.join(tmp, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'x', scripts: {} }));
    P.writeConfig(specsDir, { ...P.DEFAULTS, language: 'node', git_forge: 'gitlab', protected_branches: ['staging', 'main'], branch_flow: ['staging', 'main'] });
    const { exists, drift } = P.diffConfig(specsDir, tmp);
    assert.equal(exists, true);
    const keys = drift.map((d) => d.key);
    assert.ok(keys.includes('git_forge'), 'git_forge drifted from inferred github');
    assert.ok(!keys.includes('language'), 'language matches inferred node → not drifted');
    assert.ok(!keys.includes('protected_branches'), 'user-authored field never flagged as drift');
  } finally { rmrf(tmp); }
});

test('diffConfig: absent config.md → exists:false (migration case)', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    assert.deepEqual(P.diffConfig(path.join(tmp, 'specs'), tmp), { exists: false, drift: [] });
  } finally { rmrf(tmp); }
});

test('valuesEqual: order-insensitive for lists, strict for scalars', () => {
  assert.equal(P.valuesEqual(['a', 'b'], ['b', 'a']), true);
  assert.equal(P.valuesEqual(['a'], ['a', 'b']), false);
  assert.equal(P.valuesEqual('node', 'node'), true);
  assert.equal(P.valuesEqual('node', 'python'), false);
});

test('mergeConfigDrift: applies only approved keys + refreshes the cache', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    const specsDir = path.join(tmp, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'x', scripts: {} }));
    P.writeConfig(specsDir, { ...P.DEFAULTS, language: 'node', git_forge: 'gitlab', protected_branches: ['staging', 'main'], branch_flow: ['staging', 'main'] });
    const updated = P.mergeConfigDrift(specsDir, tmp, ['git_forge']);
    assert.equal(updated.git_forge, 'github', 'approved field applied');
    assert.equal(updated.language, 'node', 'unapproved field untouched');
    const cache = P.readConfigCache(tmp);
    // The cache stores only the hook-relevant keys (protected_branches /
    // branch_flow / end_state); git_forge is not cached. Assert the cache was
    // rewritten with a valid derived protected_branches (branch_flow-driven).
    assert.equal(cache.version, 1);
    assert.deepEqual(cache.protected_branches, ['staging', 'main']);
  } finally { rmrf(tmp); }
});
