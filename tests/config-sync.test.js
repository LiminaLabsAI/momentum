'use strict';

/**
 * ENH-062 — `momentum config sync` CLI.
 *
 * Drives the real CLI against temp git repos with piped stdin:
 *   - drift detected → "a" applies all
 *   - drift detected → "s" skips (config untouched)
 *   - founded project without config.md → created (migration)
 *   - --dry-run → no write
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');

function git(repo, args) {
  return spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
}

function setupRepo() {
  const tmp = mktmp('momentum-config-sync-');
  const repo = path.join(tmp, 'proj');
  fs.mkdirSync(repo);
  git(repo, ['init', '-q']);
  git(repo, ['config', 'user.email', 't@momentum.test']);
  git(repo, ['config', 'user.name', 'Momentum Test']);
  return { tmp, repo };
}

function writeConfig(repo, body) {
  const d = path.join(repo, 'specs');
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'config.md'), body);
}

const GITHUB_CONFIG = `---
type: Config
---

# Project Config

| Key | Value |
|-----|-------|
| language | node |
| framework | none |
| test_command | npm test |
| build_command | none |
| publish_target | npm |
| git_forge | github |
| release_command | gh release create |
| release_flow | tag-and-publish |
| end_state | merge-after-yes |
| branch_flow | staging, main |
| protected_branches | staging, main |
`;

test('config sync: drift → "a" applies all inferable fields', () => {
  const { tmp, repo } = setupRepo();
  try {
    fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ name: 'x' }));
    // drift: forge says gitlab, but inferred (no remote) is github
    writeConfig(repo, GITHUB_CONFIG.replace('git_forge | github', 'git_forge | gitlab'));
    const r = runCli(['config', 'sync', repo], { input: 'a\n' });
    assert.equal(r.status, 0, `sync failed: ${r.stderr}`);
    assert.match(r.stdout, /synced/);
    const after = fs.readFileSync(path.join(repo, 'specs', 'config.md'), 'utf8');
    assert.match(after, /git_forge \| github/, 'forge synced to inferred github');
  } finally { rmrf(tmp); }
});

test('config sync: drift → "s" skips (config untouched)', () => {
  const { tmp, repo } = setupRepo();
  try {
    fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ name: 'x' }));
    writeConfig(repo, GITHUB_CONFIG.replace('git_forge | github', 'git_forge | gitlab'));
    const r = runCli(['config', 'sync', repo], { input: 's\n' });
    assert.equal(r.status, 0, `sync failed: ${r.stderr}`);
    assert.match(r.stdout, /skipped/);
    const after = fs.readFileSync(path.join(repo, 'specs', 'config.md'), 'utf8');
    assert.match(after, /git_forge \| gitlab/, 'config left unchanged');
  } finally { rmrf(tmp); }
});

test('config sync: founded project without config.md → created (migration)', () => {
  const { tmp, repo } = setupRepo();
  try {
    fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ name: 'x' }));
    fs.mkdirSync(path.join(repo, 'specs', 'vision'), { recursive: true });
    fs.mkdirSync(path.join(repo, 'specs', 'planning'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'specs', 'vision', 'project-charter.md'), '# charter\n');
    fs.writeFileSync(path.join(repo, 'specs', 'planning', 'roadmap.md'), '# roadmap\n');
    const r = runCli(['config', 'sync', repo], {});
    assert.equal(r.status, 0, `sync failed: ${r.stderr}`);
    assert.match(r.stdout, /added/);
    assert.ok(fs.existsSync(path.join(repo, 'specs', 'config.md')));
  } finally { rmrf(tmp); }
});

test('config sync: --dry-run previews without writing', () => {
  const { tmp, repo } = setupRepo();
  try {
    fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ name: 'x' }));
    writeConfig(repo, GITHUB_CONFIG.replace('git_forge | github', 'git_forge | gitlab'));
    const r = runCli(['config', 'sync', repo, '--dry-run'], { input: 'a\n' });
    assert.equal(r.status, 0, `sync failed: ${r.stderr}`);
    assert.match(r.stdout, /would sync/);
    const after = fs.readFileSync(path.join(repo, 'specs', 'config.md'), 'utf8');
    assert.match(after, /git_forge \| gitlab/, 'dry-run left config unchanged');
  } finally { rmrf(tmp); }
});

test('config sync: no specs skeleton → friendly message, no crash', () => {
  const { tmp, repo } = setupRepo();
  try {
    const r = runCli(['config', 'sync', repo], {});
    assert.equal(r.status, 0, `sync failed: ${r.stderr}`);
    assert.match(r.stdout, /no specs/);
  } finally { rmrf(tmp); }
});
