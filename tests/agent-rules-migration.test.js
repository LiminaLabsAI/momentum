'use strict';

// Phase 23 / ADR-0004 — migration of the retired `.agent/rules/project.md`.
//
// `momentum upgrade` must: remove a PRISTINE installed copy (content sha256
// matches a historically shipped revision, per
// core/instructions/legacy-project-md-hashes.json); KEEP a customized copy
// with a deprecation warning — including shielding it from Phase 20 orphan
// cleanup when an old lock file lists it as managed; and honor --dry-run.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const { mktmp, rmrf, runCli, read, write } = require('./_helpers');

const REPO = path.join(__dirname, '..');

/**
 * Fetch a historically shipped project.md revision from the repo's own git
 * history (the file was deleted in Phase 23; its blobs remain reachable).
 */
function historicalProjectMd() {
  const commits = execSync('git log --format=%H -- core/agent-rules/project.md', {
    cwd: REPO, encoding: 'utf8',
  }).trim().split('\n');
  for (const c of commits) {
    const line = execSync(`git ls-tree ${c} -- core/agent-rules/project.md`, {
      cwd: REPO, encoding: 'utf8',
    }).trim();
    if (!line) continue; // deletion commit — file absent in its tree
    const blob = line.split(/\s+/)[2];
    return execSync(`git cat-file blob ${blob}`, { cwd: REPO, encoding: 'utf8' });
  }
  throw new Error('no historical project.md blob found in git history');
}

function initProject(target) {
  const res = runCli(['init', target, '--agent', 'claude-code']);
  assert.equal(res.status, 0, `init failed: ${res.stderr}`);
}

test('upgrade — pristine historical project.md is removed (rules ride the primary instruction now)', () => {
  const target = mktmp();
  try {
    initProject(target);
    const rulesPath = path.join(target, '.agent', 'rules', 'project.md');
    fs.mkdirSync(path.dirname(rulesPath), { recursive: true });
    fs.writeFileSync(rulesPath, historicalProjectMd());

    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /removed: \.agent\/rules\/project\.md \(pristine/);
    assert.match(res.stdout, /agent-rules:\s+removed/);
    assert.ok(!fs.existsSync(rulesPath), 'pristine copy must be deleted');
  } finally { rmrf(target); }
});

test('upgrade — pristine copy with an extra trailing newline still counts as pristine', () => {
  const target = mktmp();
  try {
    initProject(target);
    const rulesPath = path.join(target, '.agent', 'rules', 'project.md');
    fs.mkdirSync(path.dirname(rulesPath), { recursive: true });
    fs.writeFileSync(rulesPath, historicalProjectMd() + '\n\n');

    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /agent-rules:\s+removed/);
    assert.ok(!fs.existsSync(rulesPath), 'whitespace-only difference is not customization');
  } finally { rmrf(target); }
});

test('upgrade — customized project.md is kept with a deprecation warning', () => {
  const target = mktmp();
  try {
    initProject(target);
    const rulesPath = path.join(target, '.agent', 'rules', 'project.md');
    const custom = '# my heavily customized rules\n\nnever delete me\n';
    fs.mkdirSync(path.dirname(rulesPath), { recursive: true });
    fs.writeFileSync(rulesPath, custom);

    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /kept: \.agent\/rules\/project\.md — customized content detected/);
    assert.match(res.stdout, /Project Extensions/);
    assert.match(res.stdout, /agent-rules:\s+kept-customized/);
    assert.equal(read(rulesPath), custom, 'customized copy must survive byte-for-byte');
    assert.ok(!fs.existsSync(rulesPath + '.bak'), 'no .bak — nothing was overwritten');
  } finally { rmrf(target); }
});

test('upgrade — customized copy listed in an old lock file survives orphan cleanup', () => {
  const target = mktmp();
  try {
    initProject(target);
    // Simulate a pre-Phase-23 install: the lock file lists project.md as
    // managed, and the file exists with user customizations.
    const rulesPath = path.join(target, '.agent', 'rules', 'project.md');
    const custom = '# customized long ago\n';
    fs.mkdirSync(path.dirname(rulesPath), { recursive: true });
    fs.writeFileSync(rulesPath, custom);
    const lockPath = path.join(target, '.momentum', 'installed.json');
    const lock = JSON.parse(read(lockPath));
    // Phase 22c: agents[agent].files is a string array
    lock.agents['claude-code'].files.push('.agent/rules/project.md');
    write(lockPath, JSON.stringify(lock, null, 2));

    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /kept \(not orphan-cleaned\): \.agent\/rules\/project\.md/);
    assert.equal(read(rulesPath), custom, 'orphan cleanup must not delete a kept-customized file');
    assert.ok(!fs.existsSync(rulesPath + '.bak'), 'orphan cleanup must not .bak it either');
  } finally { rmrf(target); }
});

test('upgrade --dry-run — reports pristine removal without writing', () => {
  const target = mktmp();
  try {
    initProject(target);
    const rulesPath = path.join(target, '.agent', 'rules', 'project.md');
    const pristine = historicalProjectMd();
    fs.mkdirSync(path.dirname(rulesPath), { recursive: true });
    fs.writeFileSync(rulesPath, pristine);

    const res = runCli(['upgrade', target, '--dry-run']);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /would remove: \.agent\/rules\/project\.md \(pristine/);
    assert.equal(read(rulesPath), pristine, 'dry run must not delete');
  } finally { rmrf(target); }
});
