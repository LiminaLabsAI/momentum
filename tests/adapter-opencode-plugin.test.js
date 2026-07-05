'use strict';

/**
 * Phase 22 G2 — momentum enforcement plugin unit tests (node-only).
 *
 * The plugin ships as an ES module for opencode's Bun-based loader; these
 * tests copy it to a `.mjs` file and dynamic-import it so plain `node --test`
 * can drive the hooks directly — no opencode runtime required. Live firing
 * inside a real opencode session is G5 evidence, not this file's job.
 *
 * Semantics under test mirror the shared shell hooks
 * (core/scripts/brainstorm-gate.sh et al.): same sentinels, same outcomes.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, REPO_ROOT } = require('./_helpers');

const PLUGIN_SRC = path.join(REPO_ROOT, 'adapters', 'opencode', 'plugins', 'momentum.js');

async function loadPluginHooks(root) {
  // Import via a .mjs copy: the repo is CommonJS, so importing the .js
  // directly would parse it as CJS and choke on `export`.
  const mjsPath = path.join(root, 'momentum-plugin-under-test.mjs');
  fs.copyFileSync(PLUGIN_SRC, mjsPath);
  const mod = await import(`file://${mjsPath}?v=${Date.now()}`);
  assert.equal(typeof mod.MomentumPlugin, 'function', 'plugin must export MomentumPlugin');
  return mod.MomentumPlugin({ directory: root, worktree: root });
}

function withSentinel(root) {
  fs.mkdirSync(path.join(root, '.momentum'), { recursive: true });
  fs.writeFileSync(path.join(root, '.momentum', 'brainstorm-active'), '');
}

function captureLogs(fn) {
  const logs = [];
  const orig = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  return Promise.resolve()
    .then(fn)
    .then(
      (r) => ((console.log = orig), { logs, result: r }),
      (e) => {
        console.log = orig;
        throw e;
      },
    );
}

test('gate blocks write-class tools under specs/ while brainstorm-active exists', async () => {
  const root = mktmp();
  try {
    const hooks = await loadPluginHooks(root);
    withSentinel(root);
    for (const tool of ['write', 'edit', 'patch']) {
      await assert.rejects(
        () => hooks['tool.execute.before']({ tool }, { args: { filePath: 'specs/status.md' } }),
        /brainstorm-gate/,
        `${tool} targeting specs/ must be blocked`,
      );
    }
  } finally {
    rmrf(root);
  }
});

test('gate blocks bash commands that touch specs/ paths (shell heuristic)', async () => {
  const root = mktmp();
  try {
    const hooks = await loadPluginHooks(root);
    withSentinel(root);
    await assert.rejects(
      () =>
        hooks['tool.execute.before'](
          { tool: 'bash' },
          { args: { command: 'echo drafted >> specs/status.md' } },
        ),
      /brainstorm-gate/,
    );
  } finally {
    rmrf(root);
  }
});

test('gate allows specs/ writes when no sentinel, and non-specs writes always', async () => {
  const root = mktmp();
  try {
    const hooks = await loadPluginHooks(root);
    // no sentinel → allowed
    await hooks['tool.execute.before']({ tool: 'write' }, { args: { filePath: 'specs/x.md' } });
    withSentinel(root);
    // sentinel + non-specs path → allowed
    await hooks['tool.execute.before']({ tool: 'write' }, { args: { filePath: 'src/index.js' } });
    // sentinel + read-class tool → allowed
    await hooks['tool.execute.before']({ tool: 'read' }, { args: { filePath: 'specs/x.md' } });
    // sentinel + bash not touching specs/ → allowed
    await hooks['tool.execute.before']({ tool: 'bash' }, { args: { command: 'git status' } });
  } finally {
    rmrf(root);
  }
});

test('gate is not fooled by ../ traversal into specs/', async () => {
  const root = mktmp();
  try {
    const hooks = await loadPluginHooks(root);
    withSentinel(root);
    await assert.rejects(
      () =>
        hooks['tool.execute.before'](
          { tool: 'write' },
          { args: { filePath: 'src/../specs/status.md' } },
        ),
      /brainstorm-gate/,
    );
  } finally {
    rmrf(root);
  }
});

test('history reminder fires once per throttle window (real payload: args only in before, callID correlation)', async () => {
  const root = mktmp();
  try {
    const hooks = await loadPluginHooks(root);
    // Live-confirmed payload shape (Phase 22 G5): the after hook does NOT
    // receive tool args — the plugin must correlate via callID.
    const first = await captureLogs(async () => {
      await hooks['tool.execute.before'](
        { tool: 'edit', callID: 'call-1' },
        { args: { filePath: 'src/app.js' } },
      );
      await hooks['tool.execute.after']({ tool: 'edit', callID: 'call-1' }, { output: 'ok' });
    });
    assert.equal(first.logs.length, 1, 'first meaningful edit must log a reminder');
    assert.match(first.logs[0], /history/i);
    assert.ok(
      fs.existsSync(path.join(root, '.momentum', 'history-reminder-stamp')),
      'reminder must write its throttle stamp',
    );
    const second = await captureLogs(async () => {
      await hooks['tool.execute.before'](
        { tool: 'edit', callID: 'call-2' },
        { args: { filePath: 'src/other.js' } },
      );
      await hooks['tool.execute.after']({ tool: 'edit', callID: 'call-2' }, { output: 'ok' });
    });
    assert.equal(second.logs.length, 0, 'second edit within throttle window must stay silent');
  } finally {
    rmrf(root);
  }
});

test('history reminder falls back to output.args when no callID correlation exists', async () => {
  const root = mktmp();
  try {
    const hooks = await loadPluginHooks(root);
    const out = await captureLogs(() =>
      hooks['tool.execute.after']({ tool: 'edit' }, { args: { filePath: 'src/app.js' } }),
    );
    assert.equal(out.logs.length, 1, 'fallback path must still produce the reminder');
  } finally {
    rmrf(root);
  }
});

test('history reminder ignores specs/ and .momentum/ writes', async () => {
  const root = mktmp();
  try {
    const hooks = await loadPluginHooks(root);
    const out = await captureLogs(async () => {
      await hooks['tool.execute.after']({ tool: 'edit' }, { args: { filePath: 'specs/status.md' } });
      await hooks['tool.execute.after'](
        { tool: 'write' },
        { args: { filePath: '.momentum/anything' } },
      );
    });
    assert.equal(out.logs.length, 0, 'spec-layer and .momentum writes must not trigger reminders');
  } finally {
    rmrf(root);
  }
});

test('handoff banner rides the event bus: fires on session.created, silent otherwise', async () => {
  const root = mktmp();
  try {
    const hooks = await loadPluginHooks(root);
    // Live-verified (fix/opencode-sessionstart-banner): session events reach
    // plugins ONLY via the generic `event` handler — a named "session.created"
    // hook key never fires on opencode 1.17.x.
    assert.equal(typeof hooks.event, 'function', 'plugin must register the event bus handler');
    assert.equal('session.created' in hooks, false, 'dead named hook key must not ship');

    const silent = await captureLogs(() => hooks.event({ event: { type: 'session.created' } }));
    assert.equal(silent.logs.length, 0, 'no inbox → no banner');

    fs.mkdirSync(path.join(root, '.momentum', 'inbox'), { recursive: true });
    fs.writeFileSync(path.join(root, '.momentum', 'inbox', 'handoff-001.md'), '# handoff');
    const other = await captureLogs(() => hooks.event({ event: { type: 'session.idle' } }));
    assert.equal(other.logs.length, 0, 'non-session.created events → no banner');
    const banner = await captureLogs(() => hooks.event({ event: { type: 'session.created' } }));
    assert.equal(banner.logs.length, 1, 'pending handoff → one banner line');
    assert.match(banner.logs[0], /handoff-001\.md/);
    assert.match(banner.logs[0], /continue/);
  } finally {
    rmrf(root);
  }
});

test('run-mode skips the event handler entirely (upstream hang guard)', async () => {
  const root = mktmp();
  const origArgv = process.argv;
  try {
    // The event handler's mere presence hangs `opencode run` (1.17.13) — the
    // plugin must not register it when the process is a run-mode invocation.
    process.argv = [...origArgv.slice(0, 2), 'run', '--model', 'x', 'prompt'];
    const hooks = await loadPluginHooks(root);
    assert.equal('event' in hooks, false, 'run-mode must not register the event bus handler');
    // The tool hooks stay active in run-mode — gate and reminder still work.
    assert.equal(typeof hooks['tool.execute.before'], 'function');
    assert.equal(typeof hooks['tool.execute.after'], 'function');
  } finally {
    process.argv = origArgv;
    rmrf(root);
  }
});

test('session.created delegates to the installed sessionstart-handoff.sh when present (ENH-058)', async () => {
  const root = mktmp();
  try {
    fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'scripts', 'sessionstart-handoff.sh'),
      '#!/usr/bin/env bash\necho "ECO-BANNER ecosystem: test-eco (2 members)" >&2\necho "HANDOFF-BANNER 1 pending" >&2\nexit 0\n',
      { mode: 0o755 },
    );
    const hooks = await loadPluginHooks(root);
    const out = await captureLogs(() => hooks.event({ event: { type: 'session.created' } }));
    assert.equal(out.logs.length, 1, 'script output surfaces as one banner log');
    assert.match(out.logs[0], /ECO-BANNER ecosystem: test-eco/);
    assert.match(out.logs[0], /HANDOFF-BANNER 1 pending/);
  } finally {
    rmrf(root);
  }
});

test('session.created stays silent when the installed script prints nothing', async () => {
  const root = mktmp();
  try {
    fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'scripts', 'sessionstart-handoff.sh'),
      '#!/usr/bin/env bash\nexit 0\n',
      { mode: 0o755 },
    );
    // Even with a pending handoff on disk, the installed script owns the
    // banner decision — the JS fallback must NOT double-report.
    fs.mkdirSync(path.join(root, '.momentum', 'inbox'), { recursive: true });
    fs.writeFileSync(path.join(root, '.momentum', 'inbox', 'handoff-001.md'), '# h');
    const hooks = await loadPluginHooks(root);
    const out = await captureLogs(() => hooks.event({ event: { type: 'session.created' } }));
    assert.equal(out.logs.length, 0, 'silent script → no banner, no fallback double-fire');
  } finally {
    rmrf(root);
  }
});

test('bash completions pipe the canonical payload into check-history-reminder.sh (ENH-058)', async () => {
  const root = mktmp();
  try {
    fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
    const captureFile = path.join(root, 'payload.json');
    fs.writeFileSync(
      path.join(root, 'scripts', 'check-history-reminder.sh'),
      `#!/usr/bin/env bash\ncat > "${captureFile}"\necho "SESSION-APPEND-OK"\n`,
      { mode: 0o755 },
    );
    const hooks = await loadPluginHooks(root);
    const out = await captureLogs(async () => {
      await hooks['tool.execute.before'](
        { tool: 'bash', callID: 'bash-1' },
        { args: { command: 'git commit -m "feat: x"' } },
      );
      await hooks['tool.execute.after']({ tool: 'bash', callID: 'bash-1' }, { output: 'done' });
    });
    const payload = JSON.parse(fs.readFileSync(captureFile, 'utf8'));
    assert.equal(payload.tool_name, 'Bash', 'canonical hook payload tool_name');
    assert.equal(payload.tool_input.command, 'git commit -m "feat: x"');
    assert.equal(out.logs.length, 1);
    assert.match(out.logs[0], /SESSION-APPEND-OK/);
  } finally {
    rmrf(root);
  }
});

test('bash completions are a no-op when the reminder script is absent', async () => {
  const root = mktmp();
  try {
    const hooks = await loadPluginHooks(root);
    const out = await captureLogs(async () => {
      await hooks['tool.execute.before'](
        { tool: 'bash', callID: 'bash-2' },
        { args: { command: 'git commit -m x' } },
      );
      await hooks['tool.execute.after']({ tool: 'bash', callID: 'bash-2' }, { output: 'done' });
    });
    assert.equal(out.logs.length, 0, 'no script → silent, no error');
  } finally {
    rmrf(root);
  }
});
