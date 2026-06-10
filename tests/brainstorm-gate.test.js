'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, REPO_ROOT } = require('./_helpers');

const HOOK = path.join(REPO_ROOT, 'core', 'scripts', 'brainstorm-gate.sh');

function runHook(input, env = {}) {
  return spawnSync('bash', [HOOK], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 5000,
  });
}

function setupProject() {
  const dir = mktmp('momentum-gate-');
  fs.mkdirSync(path.join(dir, 'specs'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
  return dir;
}

function touchSentinel(dir) {
  fs.writeFileSync(path.join(dir, '.momentum', 'brainstorm-active'), '');
}

// ---------------------------------------------------------------------------
// Hook script exists and is executable
// ---------------------------------------------------------------------------
test('hook script exists and is executable', () => {
  const st = fs.statSync(HOOK);
  assert.equal(st.isFile(), true);
  // Owner execute bit
  assert.equal((st.mode & 0o100) !== 0, true, 'hook should be executable');
});

// ---------------------------------------------------------------------------
// Scenario A — non-write tool: always allowed
// ---------------------------------------------------------------------------
test('Scenario A — Read tool with sentinel present → exit 0', () => {
  const dir = setupProject();
  try {
    touchSentinel(dir);
    const res = runHook(
      { tool_name: 'Read', tool_input: { file_path: `${dir}/specs/x.md` } },
      { CLAUDE_PROJECT_DIR: dir }
    );
    assert.equal(res.status, 0, `expected 0, got ${res.status}; stderr=${res.stderr}`);
  } finally { rmrf(dir); }
});

// ---------------------------------------------------------------------------
// Scenario B — sentinel absent: Write is allowed
// ---------------------------------------------------------------------------
test('Scenario B — Write to specs/ with no sentinel → exit 0', () => {
  const dir = setupProject();
  try {
    const res = runHook(
      { tool_name: 'Write', tool_input: { file_path: `${dir}/specs/x.md` } },
      { CLAUDE_PROJECT_DIR: dir }
    );
    assert.equal(res.status, 0, `expected 0, got ${res.status}; stderr=${res.stderr}`);
  } finally { rmrf(dir); }
});

// ---------------------------------------------------------------------------
// Scenario C — sentinel present + write to specs/: BLOCKED
// ---------------------------------------------------------------------------
test('Scenario C — Write to specs/ with sentinel → exit 2 + stderr marker', () => {
  const dir = setupProject();
  try {
    touchSentinel(dir);
    const res = runHook(
      { tool_name: 'Write', tool_input: { file_path: `${dir}/specs/x.md` } },
      { CLAUDE_PROJECT_DIR: dir }
    );
    assert.equal(res.status, 2, `expected 2, got ${res.status}`);
    assert.match(res.stderr, /\[brainstorm-gate\] Blocked/);
    assert.match(res.stderr, /rm \.momentum\/brainstorm-active/);
  } finally { rmrf(dir); }
});

// ---------------------------------------------------------------------------
// Scenario D — sentinel present + write outside specs/: allowed
// ---------------------------------------------------------------------------
test('Scenario D — Write outside specs/ with sentinel → exit 0', () => {
  const dir = setupProject();
  try {
    touchSentinel(dir);
    const res = runHook(
      { tool_name: 'Write', tool_input: { file_path: `${dir}/src/x.js` } },
      { CLAUDE_PROJECT_DIR: dir }
    );
    assert.equal(res.status, 0, `expected 0, got ${res.status}; stderr=${res.stderr}`);
  } finally { rmrf(dir); }
});

// ---------------------------------------------------------------------------
// Edit and MultiEdit are also blocked
// ---------------------------------------------------------------------------
test('Edit to specs/ with sentinel → exit 2', () => {
  const dir = setupProject();
  try {
    touchSentinel(dir);
    const res = runHook(
      { tool_name: 'Edit', tool_input: { file_path: `${dir}/specs/y.md` } },
      { CLAUDE_PROJECT_DIR: dir }
    );
    assert.equal(res.status, 2);
  } finally { rmrf(dir); }
});

test('MultiEdit with relative path under specs/ → exit 2', () => {
  const dir = setupProject();
  try {
    touchSentinel(dir);
    const res = runHook(
      { tool_name: 'MultiEdit', tool_input: { file_path: 'specs/z.md' } },
      { CLAUDE_PROJECT_DIR: dir }
    );
    assert.equal(res.status, 2);
  } finally { rmrf(dir); }
});

// ---------------------------------------------------------------------------
// Fail-open paths — broken environment must not block legitimate work
// ---------------------------------------------------------------------------
test('Fail-open — missing CLAUDE_PROJECT_DIR → exit 0', () => {
  const dir = setupProject();
  try {
    touchSentinel(dir);
    // Strip CLAUDE_PROJECT_DIR from inherited env explicitly. Using `env -i`
    // would be cleaner but spawnSync `env:` replaces the env entirely.
    const res = spawnSync('bash', [HOOK], {
      input: JSON.stringify({
        tool_name: 'Write',
        tool_input: { file_path: `${dir}/specs/x.md` },
      }),
      env: { PATH: process.env.PATH || '/usr/bin:/bin' },
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.equal(res.status, 0, `expected 0 (fail-open), got ${res.status}`);
  } finally { rmrf(dir); }
});

test('Fail-open — malformed JSON input → exit 0', () => {
  const dir = setupProject();
  try {
    touchSentinel(dir);
    const res = runHook('not json at all', { CLAUDE_PROJECT_DIR: dir });
    assert.equal(res.status, 0, `expected 0 (fail-open), got ${res.status}`);
  } finally { rmrf(dir); }
});

// ---------------------------------------------------------------------------
// Sentinel cleanup workflow (Scenario D of the plan)
// ---------------------------------------------------------------------------
test('Sentinel removed → next Write allowed', () => {
  const dir = setupProject();
  try {
    touchSentinel(dir);
    const blocked = runHook(
      { tool_name: 'Write', tool_input: { file_path: `${dir}/specs/x.md` } },
      { CLAUDE_PROJECT_DIR: dir }
    );
    assert.equal(blocked.status, 2);

    fs.unlinkSync(path.join(dir, '.momentum', 'brainstorm-active'));

    const allowed = runHook(
      { tool_name: 'Write', tool_input: { file_path: `${dir}/specs/x.md` } },
      { CLAUDE_PROJECT_DIR: dir }
    );
    assert.equal(allowed.status, 0);
  } finally { rmrf(dir); }
});
