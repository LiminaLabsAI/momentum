'use strict';

/**
 * Phase 16 Rework G2.7 — Antigravity workflows smoke.
 *
 * Asserts:
 *   - Adapter-specific orchestration workflows install at .agent/workflows/
 *   - Each has valid YAML frontmatter with `description`
 *   - Each is ≤12,000 chars (Antigravity workflow size limit)
 *   - Core commands (cross-adapter) ALSO ship to .agent/workflows/
 *     via destinations.commands → .agent/workflows/ rewire
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, exists } = require('./_helpers');

const ANTIGRAVITY_OVERLAY_WORKFLOWS = [
  'scout', 'dispatch', 'handoff', 'continue', 'review-code',
];

const CORE_COMMANDS_THAT_SHOULD_SHIP_AS_WORKFLOWS = [
  'brainstorm-phase', 'start-phase', 'sync-docs', 'complete-phase',
  'track', 'validate', 'ecosystem', 'initiative', 'session',
];

test('antigravity install ships adapter-specific workflows at .agent/workflows/', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'antigravity']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    for (const name of ANTIGRAVITY_OVERLAY_WORKFLOWS) {
      const file = path.join(target, '.agent', 'workflows', `${name}.md`);
      assert.equal(exists(file), true, `expected ${file}`);
    }
  } finally {
    rmrf(target);
  }
});

test('antigravity install ships core commands as workflows', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'antigravity']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    for (const name of CORE_COMMANDS_THAT_SHOULD_SHIP_AS_WORKFLOWS) {
      const file = path.join(target, '.agent', 'workflows', `${name}.md`);
      assert.equal(exists(file), true, `expected ${file} (core/commands/${name}.md → .agent/workflows/)`);
    }
  } finally {
    rmrf(target);
  }
});

test('antigravity adapter-specific workflows have YAML frontmatter with description', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'antigravity']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    for (const name of ANTIGRAVITY_OVERLAY_WORKFLOWS) {
      const file = path.join(target, '.agent', 'workflows', `${name}.md`);
      const content = fs.readFileSync(file, 'utf8');
      assert.match(
        content,
        /^---[\s\S]*?description:[\s\S]*?---/,
        `${name}.md must have YAML frontmatter with description`,
      );
    }
  } finally {
    rmrf(target);
  }
});

test('antigravity workflows are ≤12,000 chars each (vendor size limit)', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'antigravity']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    const workflowsDir = path.join(target, '.agent', 'workflows');
    for (const f of fs.readdirSync(workflowsDir)) {
      if (!f.endsWith('.md')) continue;
      const size = fs.readFileSync(path.join(workflowsDir, f), 'utf8').length;
      assert.ok(size <= 12000, `${f} is ${size} chars (>12,000 limit per Antigravity docs)`);
    }
  } finally {
    rmrf(target);
  }
});

test('antigravity install does NOT create the legacy .antigravity/ directory', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'antigravity']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    assert.equal(
      exists(path.join(target, '.antigravity')),
      false,
      '.antigravity/ must not exist after init — Phase 16 Rework rewires to .agent/ + .agents/',
    );
  } finally {
    rmrf(target);
  }
});
