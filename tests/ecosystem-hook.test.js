'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync, spawnSync } = require('node:child_process');

const { mktmp, rmrf, runCli, write, read } = require('./_helpers');

const REPO_ROOT = path.resolve(__dirname, '..');
const HOOK_SCRIPT = path.join(REPO_ROOT, 'core', 'scripts', 'check-history-reminder.sh');
const SESSION_SCRIPT = path.join(REPO_ROOT, 'core', 'ecosystem', 'scripts', 'session-append.sh');

function runHook(input, opts = {}) {
  return spawnSync('bash', [HOOK_SCRIPT], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    timeout: 10000,
    ...opts,
  });
}

function runSessionAppend(args, opts = {}) {
  return spawnSync('bash', [SESSION_SCRIPT, ...args], {
    encoding: 'utf8',
    timeout: 10000,
    ...opts,
  });
}

function setupEcosystem() {
  const tmp = mktmp();
  // Create ecosystem at <tmp>/eco
  const ecoRes = runCli(['ecosystem', 'init', 'eco'], { cwd: tmp });
  assert.equal(ecoRes.status, 0, ecoRes.stderr || ecoRes.stdout);
  const root = path.join(tmp, 'eco');

  // Create fake momentum-installed member at <tmp>/member
  const memberDir = path.join(tmp, 'member');
  fs.mkdirSync(path.join(memberDir, 'specs'), { recursive: true });
  write(path.join(memberDir, 'CLAUDE.md'), '# Member\n');
  write(path.join(memberDir, 'specs', 'status.md'), 'x\n');

  // Register member.
  const addRes = runCli(
    ['ecosystem', 'add', '../member', '--role', 'platform', '--id', 'member'],
    { cwd: root },
  );
  assert.equal(addRes.status, 0, addRes.stderr || addRes.stdout);

  // Make the member a real git repo with one commit so the hook can read it.
  execSync('git init -q', { cwd: memberDir });
  execSync('git add .', { cwd: memberDir });
  execSync('git commit -qm initial', {
    cwd: memberDir,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t',
      GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t',
    },
  });

  return { tmp, root, memberDir };
}

// ─────────────────────────────────────────────────────────────────────────────
// session-append.sh direct invocations
// ─────────────────────────────────────────────────────────────────────────────

test('session-append.sh: writes a line + header on first call of the day', () => {
  const { tmp, root, memberDir } = setupEcosystem();
  try {
    const res = runSessionAppend(['log', 'first entry'], { cwd: memberDir });
    assert.equal(res.status, 0, res.stderr);
    const sessions = fs.readdirSync(path.join(root, 'sessions'))
      .filter((f) => f.endsWith('.md'));
    assert.equal(sessions.length, 1, 'expected one session file');
    const body = read(path.join(root, 'sessions', sessions[0]));
    assert.match(body, /^# Session /m);
    assert.match(body, /\[member\] log: first entry/);
  } finally {
    rmrf(tmp);
  }
});

test('session-append.sh: appends subsequent entries to the same day', () => {
  const { tmp, root, memberDir } = setupEcosystem();
  try {
    runSessionAppend(['log', 'one'], { cwd: memberDir });
    runSessionAppend(['log', 'two'], { cwd: memberDir });
    const sessions = fs.readdirSync(path.join(root, 'sessions'))
      .filter((f) => f.endsWith('.md'));
    assert.equal(sessions.length, 1);
    const body = read(path.join(root, 'sessions', sessions[0]));
    assert.match(body, /\[member\] log: one/);
    assert.match(body, /\[member\] log: two/);
    // Header should appear only once.
    const headers = (body.match(/^# Session /gm) || []).length;
    assert.equal(headers, 1, 'header must not repeat');
  } finally {
    rmrf(tmp);
  }
});

test('session-append.sh: includes active initiative in header when set', () => {
  const { tmp, root, memberDir } = setupEcosystem();
  try {
    fs.writeFileSync(path.join(root, '.state', 'active-initiative'), 'memory-module\n');
    runSessionAppend(['log', 'with active'], { cwd: memberDir });
    const sessions = fs.readdirSync(path.join(root, 'sessions'))
      .filter((f) => f.endsWith('.md'));
    const body = read(path.join(root, 'sessions', sessions[0]));
    assert.match(body, /Active initiative: memory-module/);
  } finally {
    rmrf(tmp);
  }
});

test('session-append.sh: silent no-op when outside any ecosystem', () => {
  const tmp = mktmp();
  try {
    const res = runSessionAppend(['log', 'orphan'], { cwd: tmp });
    assert.equal(res.status, 0, res.stderr);
    // Nothing written anywhere on the filesystem we control.
    assert.ok(!fs.existsSync(path.join(tmp, 'sessions')));
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// check-history-reminder hook end-to-end
// ─────────────────────────────────────────────────────────────────────────────

test('hook: appends a commit line on Bash with `git commit` command', () => {
  const { tmp, root, memberDir } = setupEcosystem();
  try {
    const res = runHook(
      { tool_name: 'Bash', tool_input: { command: 'git commit -m "noop"' } },
      { cwd: memberDir },
    );
    assert.equal(res.status, 0, res.stderr);
    const sessions = fs.readdirSync(path.join(root, 'sessions'))
      .filter((f) => f.endsWith('.md'));
    assert.equal(sessions.length, 1);
    const body = read(path.join(root, 'sessions', sessions[0]));
    assert.match(body, /\[member\] commit: initial/);
  } finally {
    rmrf(tmp);
  }
});

test('hook: emits phase-history reminder for significant file edits', () => {
  const tmp = mktmp();
  try {
    const res = runHook(
      { tool_name: 'Edit', tool_input: { file_path: 'specs/status.md' } },
      { cwd: tmp },
    );
    assert.equal(res.status, 0);
    assert.match(res.stdout, /PHASE HISTORY REMINDER/);
  } finally {
    rmrf(tmp);
  }
});

test('hook: silent no-op for non-significant edits + non-commit Bash', () => {
  const tmp = mktmp();
  try {
    const r1 = runHook(
      { tool_name: 'Edit', tool_input: { file_path: 'src/foo.js' } },
      { cwd: tmp },
    );
    assert.equal(r1.status, 0);
    assert.equal(r1.stdout.trim(), '');

    const r2 = runHook(
      { tool_name: 'Bash', tool_input: { command: 'ls -la' } },
      { cwd: tmp },
    );
    assert.equal(r2.status, 0);
    assert.equal(r2.stdout.trim(), '');
  } finally {
    rmrf(tmp);
  }
});
