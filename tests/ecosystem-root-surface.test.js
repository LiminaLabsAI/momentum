'use strict';

// ENH-049 — the coordination-root command surface.
//
// The ecosystem CLAUDE.md/AGENTS.md advertise slash-command primitives;
// `ecosystem init` must ship the curated fileset that makes them resolve
// (8 coordination commands + 2 session scripts + Claude Code SessionStart
// hook wiring), and `ecosystem upgrade` must retrofit/refresh it. Project/
// phase commands never ship and their presence is warned about (BUG-016
// anti-pattern), never deleted.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');

const SURFACE_COMMANDS = [
  'scout.md', 'dispatch.md', 'handoff.md', 'continue.md', 'swarm.md',
  'ecosystem.md', 'initiative.md', 'session.md',
];

function makeEco(extraArgs = []) {
  const tmp = mktmp();
  const init = runCli(['ecosystem', 'init', 'eco', ...extraArgs], { cwd: tmp });
  assert.equal(init.status, 0, `ecosystem init failed: ${init.stderr}`);
  return { tmp, root: path.join(tmp, 'eco') };
}

test('ecosystem init — ships the full coordination surface (claude-code default)', () => {
  const { tmp, root } = makeEco();
  try {
    const cmdDir = path.join(root, '.claude', 'commands');
    for (const f of SURFACE_COMMANDS) {
      assert.ok(fs.existsSync(path.join(cmdDir, f)), `missing command: ${f}`);
    }
    // Exactly the curated set — no project-layer commands.
    assert.deepEqual(fs.readdirSync(cmdDir).sort(), [...SURFACE_COMMANDS].sort());

    for (const s of ['session-append.sh', 'sessionstart-handoff.sh']) {
      const p = path.join(root, 'scripts', s);
      assert.ok(fs.existsSync(p), `missing script: ${s}`);
      assert.ok(fs.statSync(p).mode & 0o100, `${s} must be executable`);
    }

    const settings = JSON.parse(
      fs.readFileSync(path.join(root, '.claude', 'settings.json'), 'utf8'),
    );
    assert.ok(settings.hooks.SessionStart, 'SessionStart hook wired');
    assert.ok(!settings.hooks.PreToolUse, 'no project-layer PreToolUse gate');
    assert.match(JSON.stringify(settings), /sessionstart-handoff\.sh/);

    // The surface is part of the initial commit.
    assert.match(
      runCli(['ecosystem', 'status'], { cwd: root }).stdout,
      /Ecosystem: eco/,
    );
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem init --agent codex — surface lands at the codex destination', () => {
  const { tmp, root } = makeEco(['--agent', 'codex']);
  try {
    const cmdDir = path.join(root, '.codex', 'commands');
    assert.deepEqual(fs.readdirSync(cmdDir).sort(), [...SURFACE_COMMANDS].sort());
    // Claude-code-specific hook wiring is not installed for codex.
    assert.ok(!fs.existsSync(path.join(root, '.claude')));
    // Both instruction files still ship (agent-agnostic, ENH-025).
    assert.ok(fs.existsSync(path.join(root, 'CLAUDE.md')));
    assert.ok(fs.existsSync(path.join(root, 'AGENTS.md')));
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem init — unknown --agent fails before any writes', () => {
  const tmp = mktmp();
  try {
    const res = runCli(['ecosystem', 'init', 'eco', '--agent', 'nope'], { cwd: tmp });
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /unknown agent "nope"/);
    assert.ok(!fs.existsSync(path.join(tmp, 'eco')), 'no partial scaffold');
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem upgrade — retrofits a pre-ENH-049 root, then is idempotent', () => {
  const { tmp, root } = makeEco();
  try {
    // Simulate a pre-ENH-049 root: no command surface at all.
    fs.rmSync(path.join(root, '.claude'), { recursive: true });
    fs.rmSync(path.join(root, 'scripts'), { recursive: true });

    const res = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /\+ added: \.claude\/commands\/scout\.md/);
    assert.match(res.stdout, /\+ added: scripts\/session-append\.sh/);
    assert.match(res.stdout, /\+ added: \.claude\/settings\.json/);

    const again = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /= \.claude\/commands \[claude-code\]: 11 file\(s\) up to date/);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem upgrade — refreshes a stale momentum-owned command with .bak', () => {
  const { tmp, root } = makeEco();
  try {
    const scout = path.join(root, '.claude', 'commands', 'scout.md');
    fs.writeFileSync(scout, '# stale local copy\n');

    const res = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /↑ refreshed: \.claude\/commands\/scout\.md \(original saved as \.bak\)/);
    assert.ok(fs.existsSync(scout + '.bak'));
    assert.equal(fs.readFileSync(scout + '.bak', 'utf8'), '# stale local copy\n');
    assert.notEqual(fs.readFileSync(scout, 'utf8'), '# stale local copy\n');
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem upgrade — settings.json is user-owned once present (never rewritten)', () => {
  const { tmp, root } = makeEco();
  try {
    const settingsPath = path.join(root, '.claude', 'settings.json');
    const custom = '{ "hooks": {}, "userCustom": true }\n';
    fs.writeFileSync(settingsPath, custom);

    const res = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.equal(fs.readFileSync(settingsPath, 'utf8'), custom);
    assert.ok(!fs.existsSync(settingsPath + '.bak'));
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem upgrade — warns about project-layer commands, never deletes them', () => {
  const { tmp, root } = makeEco();
  try {
    const rogue = path.join(root, '.claude', 'commands', 'start-phase.md');
    fs.writeFileSync(rogue, '# does not belong here\n');

    const res = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /project-layer commands in the coordination root \(BUG-016 anti-pattern/);
    assert.match(res.stdout, /start-phase\.md/);
    assert.ok(fs.existsSync(rogue), 'warn-not-delete');
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem upgrade --dry-run — reports retrofit without writing', () => {
  const { tmp, root } = makeEco();
  try {
    fs.rmSync(path.join(root, '.claude'), { recursive: true });

    const res = runCli(['ecosystem', 'upgrade', '--dry-run'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /✋ would add: \.claude\/commands\/scout\.md/);
    assert.ok(!fs.existsSync(path.join(root, '.claude')), 'dry run must not write');
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem upgrade — manages an existing codex surface (detection, no claude clutter)', () => {
  const { tmp, root } = makeEco(['--agent', 'codex']);
  try {
    fs.rmSync(path.join(root, '.codex', 'commands', 'dispatch.md'));

    const res = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /\+ added: \.codex\/commands\/dispatch\.md/);
    assert.ok(!fs.existsSync(path.join(root, '.claude')), 'detected codex — no claude surface added');
  } finally {
    rmrf(tmp);
  }
});
