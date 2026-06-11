'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, read, write } = require('./_helpers');

test('upgrade — no-op on freshly-installed project reports unchanged', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, `upgrade failed: ${res.stderr}`);
    assert.match(res.stdout, /CLAUDE\.md:\s+unchanged/);
    assert.match(res.stdout, /agent-rules:\s+unchanged/);
  } finally { rmrf(target); }
});

test('upgrade — preserves Project Extensions byte-for-byte', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    const claudeMdPath = path.join(target, 'CLAUDE.md');
    const original = read(claudeMdPath);
    const userExtension = '\nMy custom navigation here.\n\n### Custom Rule\n\nAlways do X.\n';
    write(claudeMdPath, original + userExtension);

    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0);
    const upgraded = read(claudeMdPath);
    assert.ok(upgraded.includes(userExtension),
      'user extension should be preserved verbatim');
    assert.ok(upgraded.includes('### Rule 12'),
      'managed section should still contain Rule 12');
  } finally { rmrf(target); }
});

test('upgrade — pre-marker file gets backed up and migrated', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    // Synthesize a pre-marker CLAUDE.md (everything written without the marker)
    const claudeMdPath = path.join(target, 'CLAUDE.md');
    const preMarker = '# old project rules\n\nlegacy content from before v0.6.0.\n';
    write(claudeMdPath, preMarker);

    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /CLAUDE\.md:\s+migrated/);
    // .bak should hold the original
    assert.equal(fs.existsSync(claudeMdPath + '.bak'), true);
    assert.equal(read(claudeMdPath + '.bak'), preMarker);
    // Upgraded file should contain managed section + the appended legacy
    const upgraded = read(claudeMdPath);
    assert.match(upgraded, /### Rule 12/);
    assert.match(upgraded, /legacy content from before v0\.6\.0/);
    assert.match(upgraded, /migrated from pre-marker version/);
    // Marker appears exactly once (regression guard)
    const markerCount = (upgraded.match(/## Project Extensions/g) || []).length;
    assert.equal(markerCount, 1);
  } finally { rmrf(target); }
});

test('upgrade — script files keep their executable bit', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    runCli(['upgrade', target]);
    const hook = path.join(target, 'scripts', 'check-history-reminder.sh');
    const mode = fs.statSync(hook).mode & 0o777;
    assert.ok((mode & 0o111) !== 0,
      `hook lost executable bit after upgrade: ${mode.toString(8)}`);
  } finally { rmrf(target); }
});

test('upgrade — adapter overlay files are present after upgrade on a project that lacked them', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    // Simulate a pre-Phase-6 project: delete the overlay-shipped /review-code
    fs.unlinkSync(path.join(target, '.claude', 'commands', 'review-code.md'));
    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0);
    assert.equal(
      fs.existsSync(path.join(target, '.claude', 'commands', 'review-code.md')),
      true,
      'upgrade should add /review-code from the adapter overlay'
    );
  } finally { rmrf(target); }
});

test('upgrade — codex AGENTS.md preserves Project Extensions byte-for-byte', () => {
  const target = mktmp();
  try {
    runCli(['init', target, '--agent', 'codex']);
    const agentsMdPath = path.join(target, 'AGENTS.md');
    const original = read(agentsMdPath);
    const userExtension = '\n### Local Codex Rule\n\nPrefer concise progress updates.\n';
    write(agentsMdPath, original + userExtension);

    const res = runCli(['upgrade', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `upgrade failed: ${res.stderr}`);
    assert.match(res.stdout, /AGENTS\.md:\s+unchanged|AGENTS\.md:\s+updated/);
    const upgraded = read(agentsMdPath);
    assert.ok(upgraded.includes(userExtension),
      'Codex user extension should be preserved verbatim');
    assert.match(upgraded, /Momentum Commands in Codex/);
    assert.equal(fs.existsSync(path.join(target, '.codex', 'hooks.json')), true);
  } finally { rmrf(target); }
});

test('upgrade — antigravity AGENTS.md preserves Project Extensions byte-for-byte', () => {
  const target = mktmp();
  try {
    runCli(['init', target, '--agent', 'antigravity']);
    const agentsMdPath = path.join(target, 'AGENTS.md');
    const original = read(agentsMdPath);
    const userExtension = '\n### Local Antigravity Rule\n\nAlways use Artifacts.\n';
    write(agentsMdPath, original + userExtension);

    const res = runCli(['upgrade', target, '--agent', 'antigravity']);
    assert.equal(res.status, 0, `upgrade failed: ${res.stderr}`);
    assert.match(res.stdout, /AGENTS\.md:\s+unchanged|AGENTS\.md:\s+updated/);
    const upgraded = read(agentsMdPath);
    assert.ok(upgraded.includes(userExtension),
      'Antigravity user extension should be preserved verbatim');
    assert.match(upgraded, /Antigravity Native Artifacts Integration/);
    assert.equal(fs.existsSync(path.join(target, '.agent', 'workflows', 'brainstorm-phase.md')), true);
    assert.equal(fs.existsSync(path.join(target, '.agent', 'engines', 'subagent-dispatch.md')), true);
  } finally { rmrf(target); }
});
