'use strict';

/**
 * Phase 26 — Project Preferences, Group 0.
 *
 * Unit tests for the preferences core library (core/preferences.js) + the
 * markdown renderer (core/preferences-templates.js). Covers the reader
 * (valid/empty/missing/unknown-value-fails-closed), writer (round-trip),
 * pure inference helpers (language/forge/framework/commands), the fs-bound
 * inferPreferences against real tmp dirs, deriveProtectedBranches, the cache
 * read/write, and the founded predicate.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const P = require('../core/preferences');
const { renderPreferencesMarkdown } = require('../core/preferences-templates');
const { mktmp, rmrf } = require('./_helpers');

function writeTmpPrefs(specsDir, md) {
  fs.mkdirSync(specsDir, { recursive: true });
  fs.writeFileSync(path.join(specsDir, 'preferences.md'), md);
}

// ── parsePreferencesMarkdown ──────────────────────────────────────────────────

test('parsePreferencesMarkdown: extracts known scalar + list keys', () => {
  const md = renderPreferencesMarkdown({
    language: 'python', framework: 'fastapi', test_command: 'pytest',
    build_command: 'none', publish_target: 'pypi', git_forge: 'gitlab',
    release_command: 'glab release create', release_flow: 'tag-and-publish',
    end_state: 'merge-after-yes', branch_flow: ['main'], protected_branches: ['main'],
  });
  const raw = P.parsePreferencesMarkdown(md);
  assert.equal(raw.language, 'python');
  assert.equal(raw.git_forge, 'gitlab');
  assert.deepEqual(raw.branch_flow, ['main']);
  assert.deepEqual(raw.protected_branches, ['main']);
});

test('parsePreferencesMarkdown: empty / table-less content → {}', () => {
  assert.deepEqual(P.parsePreferencesMarkdown(''), {});
  assert.deepEqual(P.parsePreferencesMarkdown('# Project Preferences\n\nNo table here.\n'), {});
});

test('parsePreferencesMarkdown: ignores unknown keys + header/separator rows', () => {
  const md = [
    '| Key | Value |',
    '|-----|-------|',
    '| language | rust |',
    '| favorite_color | blue |',
    '| build_command | cargo build --release |',
  ].join('\n');
  const raw = P.parsePreferencesMarkdown(md);
  assert.equal(raw.language, 'rust');
  assert.equal(raw.build_command, 'cargo build --release');
  assert.equal(raw.favorite_color, undefined, 'unknown key ignored');
});

test('parsePreferencesMarkdown: list values split on comma + trimmed', () => {
  const raw = P.parsePreferencesMarkdown('| branch_flow | uat, staging ,  main |');
  assert.deepEqual(raw.branch_flow, ['uat', 'staging', 'main']);
});

// ── normalizePreferences (fail-closed) ────────────────────────────────────────

test('normalizePreferences: fills every default for an empty map', () => {
  const prefs = P.normalizePreferences({});
  for (const k of P.KNOWN_KEYS) assert.ok(k in prefs, `missing ${k}`);
  assert.equal(prefs.git_forge, 'github');
  assert.equal(prefs.end_state, 'merge-after-yes');
  assert.deepEqual(prefs.branch_flow, ['staging', 'main']);
});

test('normalizePreferences: unknown enum value → default (no throw)', () => {
  const prefs = P.normalizePreferences({ git_forge: 'sourceforge', end_state: 'ship-it' });
  assert.equal(prefs.git_forge, 'github');
  assert.equal(prefs.end_state, 'merge-after-yes');
});

test('normalizePreferences: string list key coerced to array', () => {
  const prefs = P.normalizePreferences({ branch_flow: 'main' });
  assert.deepEqual(prefs.branch_flow, ['main']);
});

test('normalizePreferences: round-trips a valid set unchanged', () => {
  const orig = {
    language: 'rust', framework: 'actix', test_command: 'cargo test',
    build_command: 'cargo build --release', publish_target: 'crates-io',
    git_forge: 'github', release_command: 'gh release create',
    release_flow: 'tag-and-publish', end_state: 'feature-branch-only',
    branch_flow: ['main'], protected_branches: ['main'],
  };
  assert.deepEqual(P.normalizePreferences(orig), orig);
});

// ── readPreferences ───────────────────────────────────────────────────────────

test('readPreferences: missing file → null', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    assert.equal(P.readPreferences(tmp), null);
  } finally { rmrf(tmp); }
});

test('readPreferences: valid file → normalized object', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    writeTmpPrefs(tmp, renderPreferencesMarkdown({
      language: 'go', framework: 'none', test_command: 'go test ./...',
      build_command: 'go build', publish_target: 'none', git_forge: 'gitea',
      release_command: 'tea release create', release_flow: 'tag-only',
      end_state: 'feature-branch-only', branch_flow: ['main'], protected_branches: ['main'],
    }));
    const prefs = P.readPreferences(tmp);
    assert.equal(prefs.language, 'go');
    assert.equal(prefs.git_forge, 'gitea');
    assert.equal(prefs.end_state, 'feature-branch-only');
    assert.deepEqual(prefs.protected_branches, ['main']);
  } finally { rmrf(tmp); }
});

// ── writePreferences (round-trip) ─────────────────────────────────────────────

test('writePreferences: writes a file readPreferences parses back', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    const orig = P.inferPreferences(tmp, { remoteUrl: 'git@gitlab.com:org/repo.git' });
    P.writePreferences(tmp, orig, { inferred: true });
    const back = P.readPreferences(tmp);
    assert.equal(back.language, orig.language);
    assert.equal(back.git_forge, 'gitlab');
    assert.equal(back.release_command, 'glab release create');
    assert.deepEqual(back.branch_flow, orig.branch_flow);
    // frontmatter type line present
    const body = fs.readFileSync(path.join(tmp, 'preferences.md'), 'utf8');
    assert.match(body, /^type: Preferences$/m);
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
  assert.equal(P.inferForge('https://codeberg.org/forgejo/forgejo'), 'forgejo');
  assert.equal(P.inferForge('git@git.internal.local:org/repo.git'), 'bare-ssh');
  assert.equal(P.inferForge(''), 'github');
  assert.equal(P.inferForge('https://unknown.example.com/repo'), 'github');
});

// ── inferFramework ────────────────────────────────────────────────────────────

test('inferFramework: next/astro from deps, none otherwise', () => {
  assert.equal(P.inferFramework({ dependencies: { next: '^14' } }), 'nextjs');
  assert.equal(P.inferFramework({ dependencies: { astro: '^4' } }), 'astro');
  assert.equal(P.inferFramework({ dependencies: { express: '^4' } }), 'none');
  assert.equal(P.inferFramework({}), 'none');
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

// ── inferPreferences (fs-bound, real tmp dirs) ────────────────────────────────

test('inferPreferences: node project with build script + github remote', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      name: 'demo', scripts: { test: 'node --test', build: 'astro build' },
    }));
    const prefs = P.inferPreferences(tmp, { remoteUrl: 'git@github.com:org/demo.git' });
    assert.equal(prefs.language, 'node');
    assert.equal(prefs.build_command, 'npm run build');
    assert.equal(prefs.publish_target, 'npm');
    assert.equal(prefs.git_forge, 'github');
    assert.equal(prefs.release_command, 'gh release create');
    assert.equal(prefs.release_flow, 'tag-and-publish');
    assert.deepEqual(prefs.protected_branches, ['staging', 'main']);
  } finally { rmrf(tmp); }
});

test('inferPreferences: python project on gitlab', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    fs.writeFileSync(path.join(tmp, 'pyproject.toml'), '[project]\nname = "demo"\n');
    const prefs = P.inferPreferences(tmp, { remoteUrl: 'https://gitlab.com/org/demo.git' });
    assert.equal(prefs.language, 'python');
    assert.equal(prefs.test_command, 'pytest');
    assert.equal(prefs.publish_target, 'pypi');
    assert.equal(prefs.git_forge, 'gitlab');
    assert.equal(prefs.release_command, 'glab release create');
  } finally { rmrf(tmp); }
});

test('inferPreferences: rust project, no remote → bare-ssh-ish fallback stays github default', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    fs.writeFileSync(path.join(tmp, 'Cargo.toml'), '[package]\nname = "demo"\n');
    const prefs = P.inferPreferences(tmp, { remoteUrl: '' });
    assert.equal(prefs.language, 'rust');
    assert.equal(prefs.publish_target, 'crates-io');
    assert.equal(prefs.git_forge, 'github');
  } finally { rmrf(tmp); }
});

test('inferPreferences: no manifest → language none, defaults', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    const prefs = P.inferPreferences(tmp, { remoteUrl: 'git@github.com:org/repo.git' });
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

test('writePreferencesCache + readPreferencesCache: round-trip', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    const prefs = { protected_branches: ['main'], branch_flow: ['main'], end_state: 'feature-branch-only' };
    P.writePreferencesCache(tmp, prefs);
    const cache = P.readPreferencesCache(tmp);
    assert.deepEqual(cache.protected_branches, ['main']);
    assert.equal(cache.end_state, 'feature-branch-only');
    assert.equal(cache.version, 1);
  } finally { rmrf(tmp); }
});

test('readPreferencesCache: missing → null', () => {
  const tmp = mktmp('momentum-prefs-');
  try {
    assert.equal(P.readPreferencesCache(tmp), null);
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
