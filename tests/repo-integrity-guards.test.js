'use strict';

/**
 * Phase 22c review — repo-integrity guards.
 *
 * Born from a live incident: an agent session accidentally ran
 * `momentum ecosystem init` inside this repo, which REPLACED the product
 * README.md and .gitignore with ecosystem-root templates and scaffolded
 * ecosystem.json/initiatives/ at the repo root — and the suite stayed
 * green through all of it. These guards pin the invariants that incident
 * violated, so the landing gate catches the whole class next time.
 * (BUG-021 tracks guarding `ecosystem init` itself.)
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');

test('README.md is the product readme, not a scaffold template', () => {
  const readme = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8');
  assert.match(readme, /img\.shields\.io\/npm/, 'npm badge must be present');
  assert.match(readme, /## Works with any AI IDE/, 'adapter table section must be present');
  assert.match(readme, /npx @avinash-singh-io\/momentum@latest init/, 'quickstart must be present');
  assert.doesNotMatch(
    readme,
    /Created by `momentum ecosystem init`/,
    'README must never be the ecosystem-root template',
  );
});

test('.gitignore keeps the .momentum/* + negation pair (BUG-014) and hygiene rules', () => {
  const gitignore = fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf8');
  assert.match(gitignore, /^\.momentum\/\*$/m, '.momentum/* rule must be present');
  assert.match(
    gitignore,
    /^!\.momentum\/installed\.json$/m,
    'the installed.json negation (BUG-014, D1 lock) must be present',
  );
  assert.match(gitignore, /^\._\*$/m, 'AppleDouble rule must be present');
});

test('the momentum repo is an ecosystem MEMBER, never an ecosystem root', () => {
  assert.equal(
    fs.existsSync(path.join(REPO_ROOT, 'ecosystem.json')),
    false,
    'ecosystem.json must not exist at the repo root (momentum is a cerebrio member)',
  );
  assert.equal(
    fs.existsSync(path.join(REPO_ROOT, 'initiatives')),
    false,
    'initiatives/ must not exist at the repo root',
  );
});
