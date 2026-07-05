'use strict';

/**
 * Phase 21a — BUG-012 regression guard.
 *
 * Every committed shell script must carry the executable bit IN THE INDEX
 * (mode 100755). The primary working tree masks missing exec bits when
 * `core.fileMode=false` and local chmods were never committed — but every
 * fresh clone, CI checkout, and Rule 15 lane worktree materializes the
 * committed mode, and a 100644 hook script silently no-ops (or fails the
 * suite). Checking `git ls-files -s` sees the committed mode directly,
 * immune to the fileMode masking.
 */

const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');

test('every committed *.sh ships with mode 100755 (BUG-012 guard)', () => {
  const res = spawnSync('git', ['ls-files', '-s'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(res.status, 0, `git ls-files failed: ${res.stderr}`);

  const offenders = res.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [meta, file] = line.split('\t');
      return { mode: meta.split(' ')[0], file };
    })
    .filter((e) => e.file && e.file.endsWith('.sh') && e.mode !== '100755');

  assert.deepEqual(
    offenders,
    [],
    `Shell scripts committed without the exec bit (fix: git update-index --chmod=+x <file>):\n` +
      offenders.map((e) => `  ${e.mode} ${e.file}`).join('\n')
  );
});

// BUG-017: the .sh guard above never covered .githooks/ (extensionless hook
// wrappers + node libs). Git only runs a hook whose file is executable, so a
// 100644 commit-msg/pre-push means every fresh clone and lane worktree runs
// with Rule 6 enforcement silently OFF. The installer chmods every hook file
// 0o755 (bin/momentum.js installGitHooks), so the committed mode must match
// or each upgrade dirties the tree with mode-only diffs.
test('every committed .githooks/ file ships with mode 100755, no .bak artifacts (BUG-017 guard)', () => {
  const res = spawnSync('git', ['ls-files', '-s', '--', '.githooks'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(res.status, 0, `git ls-files failed: ${res.stderr}`);

  const entries = res.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [meta, file] = line.split('\t');
      return { mode: meta.split(' ')[0], file };
    });

  const nonExec = entries.filter((e) => !e.file.endsWith('.md') && e.mode !== '100755');
  assert.deepEqual(
    nonExec,
    [],
    `.githooks/ files committed without the exec bit (fix: git update-index --chmod=+x <file>):\n` +
      nonExec.map((e) => `  ${e.mode} ${e.file}`).join('\n')
  );

  const baks = entries.filter((e) => e.file.endsWith('.bak'));
  assert.deepEqual(
    baks,
    [],
    `Upgrade .bak artifacts must not be tracked under .githooks/ (fix: git rm <file>; .gitignore covers *.bak):\n` +
      baks.map((e) => `  ${e.file}`).join('\n')
  );
});
