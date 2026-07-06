'use strict';

/**
 * BUG-021 — `momentum ecosystem init` must refuse to scaffold into an
 * existing project (it would REPLACE README.md/.gitignore with ecosystem
 * templates — observed live, destructive). An ecosystem root is its own
 * directory, a sibling of member repos.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, runCli } = require('./_helpers');

test('ecosystem init refuses inside an existing project (no positional → CWD)', () => {
  const tmp = mktmp('bug021-');
  const project = path.join(tmp, 'my-app');
  fs.mkdirSync(project, { recursive: true });
  write(path.join(project, 'README.md'), '# my app\n');
  write(path.join(project, 'package.json'), '{"name":"my-app"}\n');
  try {
    const r = runCli(['ecosystem', 'init'], { cwd: project });
    assert.notEqual(r.status, 0, 'must refuse');
    assert.match(r.stderr, /looks like an existing project/);
    assert.match(r.stderr, /SIBLING/i, 'message must point at the sibling topology');
    assert.equal(fs.readFileSync(path.join(project, 'README.md'), 'utf8'), '# my app\n', 'README untouched');
    assert.equal(fs.existsSync(path.join(project, 'ecosystem.json')), false);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem init still works in a fresh directory and with a name positional', () => {
  const tmp = mktmp('bug021-ok-');
  try {
    let r = runCli(['ecosystem', 'init', 'my-eco'], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(tmp, 'my-eco', 'ecosystem.json')));

    // --force overrides the guard.
    const project = path.join(tmp, 'proj');
    fs.mkdirSync(project);
    write(path.join(project, 'package.json'), '{}\n');
    r = runCli(['ecosystem', 'init', '--force'], { cwd: project });
    assert.equal(r.status, 0, `--force should proceed: ${r.stderr}`);
    assert.ok(fs.existsSync(path.join(project, 'ecosystem.json')));
  } finally {
    rmrf(tmp);
  }
});
