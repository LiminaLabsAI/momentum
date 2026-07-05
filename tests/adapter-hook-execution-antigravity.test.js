'use strict';

/**
 * Phase 22b — Antigravity hook execution against the REAL 2.x contract
 * (ADR-0006; payload shapes captured live from agy 1.0.16 — see
 * specs/phases/phase-22b-antigravity-2-adoption/evidence/fact-sheet.md §5).
 *
 * The shim `scripts/antigravity-hook-adapter.sh` receives camelCase
 * protojson payloads on stdin with CWD = .agents/ (the hooks.json
 * directory), and must ALWAYS exit 0, responding via stdout JSON:
 *   PreToolUse    → {"decision":"allow"|"deny", "reason"?}
 *   PostToolUse   → {} (reminders queued to .momentum/antigravity-notices)
 *   PreInvocation → {"injectSteps":[{"ephemeralMessage": ...}]} or {}
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, fakeToolEvent, payloads } = require('./_helpers');

function setupAntigravityProject() {
  const dir = mktmp('momentum-antigravity-hooks-');
  const res = runCli(['init', dir, '--agent', 'antigravity']);
  if (res.status !== 0) {
    rmrf(dir);
    throw new Error(`init failed: ${res.stderr}`);
  }
  return fs.realpathSync(dir);
}

function hooksFileOf(dir) {
  return path.join(dir, '.agents', 'hooks.json');
}

test('antigravity hooks.json uses the vendor named-group schema with no SessionStart', () => {
  const dir = setupAntigravityProject();
  try {
    const config = JSON.parse(fs.readFileSync(hooksFileOf(dir), 'utf8'));
    assert.ok(!config.hooks, 'legacy {hooks:{...}} wrapper must be gone (ADR-0006)');
    assert.ok(config['momentum-brainstorm-gate'], 'named group momentum-brainstorm-gate');
    assert.ok(config['momentum-history-reminder'], 'named group momentum-history-reminder');
    assert.ok(config['momentum-session-context'], 'named group momentum-session-context');
    const raw = fs.readFileSync(hooksFileOf(dir), 'utf8');
    assert.ok(!/SessionStart/.test(raw), 'SessionStart does not exist on Antigravity');
    // Loop events are FLAT handler lists (no matcher wrapper).
    const pre = config['momentum-session-context'].PreInvocation;
    assert.ok(Array.isArray(pre) && pre[0].command, 'PreInvocation must be a flat handler list');
    assert.ok(!pre[0].matcher, 'PreInvocation handlers take no matcher');
  } finally {
    rmrf(dir);
  }
});

test('antigravity PreToolUse: write into specs/ during brainstorm is DENIED via decision JSON', () => {
  const dir = setupAntigravityProject();
  try {
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.momentum', 'brainstorm-active'), '');
    const result = fakeToolEvent({
      hooksFile: hooksFileOf(dir),
      event: 'PreToolUse',
      toolName: 'write_to_file',
      payload: payloads.antigravityWriteToFile(dir, path.join(dir, 'specs', 'status.md')),
      cwd: dir,
    });
    assert.ok(result.exits.length > 0, 'expected the PreToolUse hook to fire on write_to_file');
    assert.ok(result.exits.every((e) => e === 0), `vendor contract: ALWAYS exit 0; got ${JSON.stringify(result.exits)}`);
    const decision = JSON.parse(result.stdouts.find((s) => s.trim()));
    assert.equal(decision.decision, 'deny');
    assert.match(decision.reason, /brainstorm/i);
  } finally {
    rmrf(dir);
  }
});

test('antigravity PreToolUse: write outside specs/ during brainstorm is allowed', () => {
  const dir = setupAntigravityProject();
  try {
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.momentum', 'brainstorm-active'), '');
    const result = fakeToolEvent({
      hooksFile: hooksFileOf(dir),
      event: 'PreToolUse',
      toolName: 'write_to_file',
      payload: payloads.antigravityWriteToFile(dir, path.join(dir, 'src', 'index.js')),
      cwd: dir,
    });
    const decision = JSON.parse(result.stdouts.find((s) => s.trim()));
    assert.equal(decision.decision, 'allow');
  } finally {
    rmrf(dir);
  }
});

test('antigravity PreToolUse: run_command targeting specs/ during brainstorm is DENIED', () => {
  const dir = setupAntigravityProject();
  try {
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.momentum', 'brainstorm-active'), '');
    const result = fakeToolEvent({
      hooksFile: hooksFileOf(dir),
      event: 'PreToolUse',
      toolName: 'run_command',
      payload: payloads.antigravityRunCommand(dir, 'echo hijack > specs/status.md'),
      cwd: dir,
    });
    const decision = JSON.parse(result.stdouts.find((s) => s.trim()));
    assert.equal(decision.decision, 'deny');
  } finally {
    rmrf(dir);
  }
});

test('antigravity PreToolUse: no brainstorm sentinel → allow', () => {
  const dir = setupAntigravityProject();
  try {
    const result = fakeToolEvent({
      hooksFile: hooksFileOf(dir),
      event: 'PreToolUse',
      toolName: 'write_to_file',
      payload: payloads.antigravityWriteToFile(dir, path.join(dir, 'specs', 'status.md')),
      cwd: dir,
    });
    const decision = JSON.parse(result.stdouts.find((s) => s.trim()));
    assert.equal(decision.decision, 'allow');
  } finally {
    rmrf(dir);
  }
});

test('antigravity PreToolUse: non-matching tool (list_dir) is bypassed by the matcher', () => {
  const dir = setupAntigravityProject();
  try {
    const result = fakeToolEvent({
      hooksFile: hooksFileOf(dir),
      event: 'PreToolUse',
      toolName: 'list_dir',
      payload: payloads.antigravityPreTool(dir, 'list_dir', { AbsolutePath: dir }),
      cwd: dir,
    });
    assert.equal(result.exits.length, 0, 'list_dir must not match the write-family matcher');
  } finally {
    rmrf(dir);
  }
});

test('antigravity PostToolUse: significant edit queues a HISTORY REMINDER notice and responds {}', () => {
  const dir = setupAntigravityProject();
  try {
    const result = fakeToolEvent({
      hooksFile: hooksFileOf(dir),
      event: 'PostToolUse',
      toolName: 'write_to_file',
      payload: payloads.antigravityPostTool(dir, 'write_to_file', {
        TargetFile: path.join(dir, 'specs', 'status.md'),
        CodeContent: 'x',
      }),
      cwd: dir,
    });
    assert.ok(result.exits.length > 0, 'expected PostToolUse hook to fire');
    assert.ok(result.exits.every((e) => e === 0), `ALWAYS exit 0; got ${JSON.stringify(result.exits)}`);
    assert.equal(result.stdouts.find((s) => s.trim()).trim(), '{}', 'PostToolUse output contract is {}');
    const notices = fs.readFileSync(path.join(dir, '.momentum', 'antigravity-notices'), 'utf8');
    assert.match(notices, /HISTORY REMINDER/);
  } finally {
    rmrf(dir);
  }
});

test('antigravity PostToolUse: toolCall null (non-tool step) is a silent no-op', () => {
  const dir = setupAntigravityProject();
  try {
    const result = fakeToolEvent({
      hooksFile: hooksFileOf(dir),
      event: 'PostToolUse',
      toolName: 'write_to_file', // matcher check uses the runtime tool name
      payload: payloads.antigravityPostTool(dir, null, null),
      cwd: dir,
    });
    assert.ok(result.exits.every((e) => e === 0));
    assert.equal(result.stdouts.find((s) => s.trim()).trim(), '{}');
    assert.ok(!fs.existsSync(path.join(dir, '.momentum', 'antigravity-notices')),
      'null toolCall must queue nothing');
  } finally {
    rmrf(dir);
  }
});

test('antigravity PreInvocation at invocationNum 0 injects handoff banner + drains queued notices', () => {
  const dir = setupAntigravityProject();
  try {
    fs.mkdirSync(path.join(dir, '.momentum', 'inbox'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, '.momentum', 'inbox', 'handoff-001.md'),
      '# Handoff\n\n**fromRepo:** ../other\n\n## Summary\nPick up the probe work\n',
    );
    fs.writeFileSync(path.join(dir, '.momentum', 'antigravity-notices'), 'HISTORY REMINDER: queued note\n');
    const result = fakeToolEvent({
      hooksFile: hooksFileOf(dir),
      event: 'PreInvocation',
      toolName: '',
      payload: payloads.antigravityPreInvocation(dir, 0),
      cwd: dir,
    });
    assert.ok(result.exits.every((e) => e === 0));
    const out = JSON.parse(result.stdouts.find((s) => s.trim()));
    assert.ok(Array.isArray(out.injectSteps) && out.injectSteps.length === 1, 'one injectStep');
    const msg = out.injectSteps[0].ephemeralMessage;
    assert.match(msg, /handoff-001/);
    assert.match(msg, /HISTORY REMINDER: queued note/);
    assert.equal(fs.readFileSync(path.join(dir, '.momentum', 'antigravity-notices'), 'utf8'), '',
      'queue must be drained after injection');
  } finally {
    rmrf(dir);
  }
});

test('antigravity PreInvocation with nothing pending responds {}', () => {
  const dir = setupAntigravityProject();
  try {
    const result = fakeToolEvent({
      hooksFile: hooksFileOf(dir),
      event: 'PreInvocation',
      toolName: '',
      payload: payloads.antigravityPreInvocation(dir, 3),
      cwd: dir,
    });
    assert.ok(result.exits.every((e) => e === 0));
    assert.equal(result.stdouts.find((s) => s.trim()).trim(), '{}');
  } finally {
    rmrf(dir);
  }
});
