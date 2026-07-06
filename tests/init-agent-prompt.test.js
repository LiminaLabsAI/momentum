'use strict';

/**
 * v0.31.0 — `init` has no default adapter.
 *
 * Non-interactive callers must pass --agent (hard error, nothing written).
 * Interactive shells get a numbered picker; MOMENTUM_FORCE_INTERACTIVE=1
 * forces the picker through piped stdin so it is testable without a pty.
 *
 * These tests pass rawArgs to runCli — the helper otherwise re-injects the
 * historical claude-code default for the pre-v0.31 suites.
 */

const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { mktmp, rmrf, runCli, exists, read } = require('./_helpers');

function freshTarget(tmpRoot) {
  const target = path.join(tmpRoot, 'proj');
  fs.mkdirSync(target);
  return target;
}

const AGENTS = ['antigravity', 'claude-code', 'codex', 'opencode']; // sorted, as listed by the CLI

test('non-interactive init without --agent fails fast and writes nothing', () => {
  const tmpRoot = mktmp('momentum-agent-prompt-');
  const target = freshTarget(tmpRoot);
  try {
    const res = runCli(['init', target], { rawArgs: true });
    assert.equal(res.status, 1);
    assert.match(res.stderr, /--agent is required/);
    for (const agent of AGENTS) {
      assert.match(res.stderr, new RegExp(agent), `error must list ${agent}`);
    }
    assert.equal(fs.readdirSync(target).length, 0, 'no files may be scaffolded');
  } finally {
    rmrf(tmpRoot);
  }
});

test('picker: numeric answer installs the numbered agent', () => {
  const tmpRoot = mktmp('momentum-agent-prompt-');
  const target = freshTarget(tmpRoot);
  try {
    // 2 = claude-code in the sorted list
    const res = runCli(['init', target], {
      rawArgs: true,
      input: '2\n',
      env: { ...process.env, MOMENTUM_FORCE_INTERACTIVE: '1' },
    });
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    assert.match(res.stdout, /Which coding agent/);
    assert.ok(exists(path.join(target, 'CLAUDE.md')), 'claude-code install marker');
    assert.match(read(path.join(target, '.momentum', 'installed.json')), /"claude-code"/);
  } finally {
    rmrf(tmpRoot);
  }
});

test('picker: agent name answer works; invalid answers re-ask', () => {
  const tmpRoot = mktmp('momentum-agent-prompt-');
  const target = freshTarget(tmpRoot);
  try {
    // two garbage answers, then a valid name
    const res = runCli(['init', target], {
      rawArgs: true,
      input: '9\nnot-an-agent\nopencode\n',
      env: { ...process.env, MOMENTUM_FORCE_INTERACTIVE: '1' },
    });
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    assert.match(res.stdout, /Enter 1-4 or an agent name/);
    assert.match(read(path.join(target, '.momentum', 'installed.json')), /"opencode"/);
  } finally {
    rmrf(tmpRoot);
  }
});

test('picker: stdin EOF without an answer exits non-zero, writes nothing', () => {
  const tmpRoot = mktmp('momentum-agent-prompt-');
  const target = freshTarget(tmpRoot);
  try {
    const res = runCli(['init', target], {
      rawArgs: true,
      input: '',
      env: { ...process.env, MOMENTUM_FORCE_INTERACTIVE: '1' },
    });
    assert.equal(res.status, 1);
    assert.match(res.stderr, /no agent selected/);
    assert.equal(fs.readdirSync(target).length, 0, 'no files may be scaffolded');
  } finally {
    rmrf(tmpRoot);
  }
});

test('explicit --agent still bypasses the prompt entirely', () => {
  const tmpRoot = mktmp('momentum-agent-prompt-');
  const target = freshTarget(tmpRoot);
  try {
    const res = runCli(['init', target, '--agent', 'claude-code'], { rawArgs: true });
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    assert.doesNotMatch(res.stdout, /Which coding agent/);
    assert.ok(exists(path.join(target, 'CLAUDE.md')));
  } finally {
    rmrf(tmpRoot);
  }
});
