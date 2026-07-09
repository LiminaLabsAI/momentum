'use strict';

/**
 * Phase 26 — Project Config, Group 2.
 *
 * Guards that `/validate` runs the config check (ADR-0009): a WARNING
 * (not failure) when a founded project lacks `specs/config.md`, and a
 * drift WARNING when the inferable fields diverge from the manifests. Also
 * exercises the `core/config.js` functions the agent uses to detect
 * drift (isFounded + readConfig + inferConfig + INFERABLE_KEYS) so
 * the library backing the prose is verified, not just the doc.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, REPO_ROOT } = require('./_helpers');
const P = require('../core/config');

const validateBody = fs.readFileSync(path.join(REPO_ROOT, 'core', 'commands', 'validate.md'), 'utf8');

test('validate.md: 2c config check — WARNING, never a failure', () => {
  const check2c = validateBody.slice(validateBody.indexOf('2c. Config'), validateBody.indexOf('3. For each phase directory'));
  assert.match(check2c, /founded AND no `specs\/config\.md`/, 'warns when founded + no config');
  assert.match(check2c, /WARNING/, 'check is a WARNING');
  assert.match(check2c, /drift/i, 'check detects drift');
  assert.match(check2c, /specs\/config\.md/, 'references specs/config.md');
  assert.match(check2c, /not founded → skip/i, 'skips the check for unfounded projects');
});

// ── library backing the drift detection ───────────────────────────────────────

test('drift detection: inferable fields differ when stored prefs disagree with manifests', () => {
  const tmp = mktmp('momentum-prefs-val-');
  try {
    // node project (package.json → inferred language=node, publish=npm)
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'demo', scripts: { build: 'x' } }));
    // store config that claim python/pypi (drifted from the manifest)
    const stored = P.inferConfig(tmp, { remoteUrl: 'git@github.com:org/demo.git' });
    stored.language = 'python';
    stored.publish_target = 'pypi';
    P.writeConfig(path.join(tmp, 'specs'), stored);

    const inferred = P.inferConfig(tmp, { remoteUrl: 'git@github.com:org/demo.git' });
    const drifted = P.INFERABLE_KEYS.filter((k) => inferred[k] !== stored[k]);
    assert.ok(drifted.includes('language'), 'language drifted (stored python vs inferred node)');
    assert.ok(drifted.includes('publish_target'), 'publish_target drifted (stored pypi vs inferred npm)');
  } finally { rmrf(tmp); }
});

test('drift detection: no drift when config match the manifests', () => {
  const tmp = mktmp('momentum-prefs-val-');
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'demo' }));
    const stored = P.inferConfig(tmp, { remoteUrl: 'git@github.com:org/demo.git' });
    P.writeConfig(path.join(tmp, 'specs'), stored);
    const inferred = P.inferConfig(tmp, { remoteUrl: 'git@github.com:org/demo.git' });
    const drifted = P.INFERABLE_KEYS.filter((k) => inferred[k] !== stored[k]);
    assert.deepEqual(drifted, [], 'no drift when config match manifests');
  } finally { rmrf(tmp); }
});

test('isFounded gates the config check (unfounded → skip)', () => {
  const tmp = mktmp('momentum-prefs-val-');
  try {
    assert.equal(P.isFounded(tmp), false);
    // a founded project with no config → the WARNING path
    fs.mkdirSync(path.join(tmp, 'specs', 'vision'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'specs', 'planning'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'specs', 'vision', 'project-charter.md'), '# charter\n');
    fs.writeFileSync(path.join(tmp, 'specs', 'planning', 'roadmap.md'), '# roadmap\n');
    assert.equal(P.isFounded(tmp), true);
    assert.equal(P.readConfig(path.join(tmp, 'specs')), null, 'founded but no config → null (the WARNING case)');
  } finally { rmrf(tmp); }
});
