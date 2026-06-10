'use strict';

/**
 * Phase 16 G1.9 — Codex subagent overlay smoke.
 *
 * Verifies that `momentum init --agent codex` installs the three
 * momentum reviewer TOML subagents into `.codex/agents/` with the
 * required Codex schema fields populated.
 *
 * We do NOT use a TOML library — Codex's subagent format is simple
 * enough to verify with regex assertions over the file content (and
 * keeping zero deps is a momentum invariant).
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, exists } = require('./_helpers');

const EXPECTED_SUBAGENTS = [
  'momentum-reviewer-security',
  'momentum-reviewer-qa',
  'momentum-reviewer-architecture',
];

const REQUIRED_TOML_KEYS = ['name', 'description', 'developer_instructions'];

test('init --agent codex installs the momentum reviewer TOML subagents to .codex/agents/', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);

    for (const subagent of EXPECTED_SUBAGENTS) {
      const file = path.join(target, '.codex', 'agents', `${subagent}.toml`);
      assert.equal(
        exists(file),
        true,
        `expected ${subagent}.toml at ${file} after init`,
      );
      const content = fs.readFileSync(file, 'utf8');
      for (const key of REQUIRED_TOML_KEYS) {
        // TOML key = value or key = """multi-line"""; either way the
        // key sits at the start of a line followed by an `=` token.
        const pattern = new RegExp(`^${key}\\s*=`, 'm');
        assert.match(
          content,
          pattern,
          `${subagent}.toml missing required Codex subagent key "${key}"`,
        );
      }
      // Sanity: the developer_instructions block isn't empty.
      const instr = content.match(/developer_instructions\s*=\s*"""([\s\S]+?)"""/);
      assert.ok(
        instr && instr[1].trim().length > 50,
        `${subagent}.toml developer_instructions appears empty or too short`,
      );
    }
  } finally {
    rmrf(target);
  }
});

test('init --agent codex installs the Codex /review-code overlay', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    assert.equal(
      exists(path.join(target, '.codex', 'commands', 'review-code.md')),
      true,
      '/review-code overlay must install to .codex/commands/review-code.md',
    );
  } finally {
    rmrf(target);
  }
});

test('init --agent codex wires the PreToolUse brainstorm-gate hook', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    const hooksFile = path.join(target, '.codex', 'hooks.json');
    assert.equal(exists(hooksFile), true, '.codex/hooks.json must exist');
    const hooks = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
    assert.ok(
      Array.isArray(hooks.hooks && hooks.hooks.PreToolUse),
      'hooks.json must declare PreToolUse entries',
    );
    const preToolUse = hooks.hooks.PreToolUse;
    const hasBrainstormGate = preToolUse.some((entry) =>
      (entry.hooks || []).some((h) =>
        /brainstorm-gate\.sh/.test(h.command || ''),
      ),
    );
    assert.ok(
      hasBrainstormGate,
      'PreToolUse must wire brainstorm-gate.sh as a hook command',
    );
    // brainstorm-gate.sh ships to scripts/ (from core/scripts/ via init).
    assert.equal(
      exists(path.join(target, 'scripts', 'brainstorm-gate.sh')),
      true,
      'scripts/brainstorm-gate.sh must be installed by init',
    );
  } finally {
    rmrf(target);
  }
});
