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

test('history reminder fires once per throttle window for meaningful edits', async () => {
  const root = mktmp();
  try {
    const hooks = await loadPluginHooks(root);
    const first = await captureLogs(() =>
      hooks['tool.execute.after']({ tool: 'edit' }, { args: { filePath: 'src/app.js' } }),
    );
    assert.equal(first.logs.length, 1, 'first meaningful edit must log a reminder');
    assert.match(first.logs[0], /history/i);
    assert.ok(
      fs.existsSync(path.join(root, '.momentum', 'history-reminder-stamp')),
      'reminder must write its throttle stamp',
    );
    const second = await captureLogs(() =>
      hooks['tool.execute.after']({ tool: 'edit' }, { args: { filePath: 'src/other.js' } }),
    );
    assert.equal(second.logs.length, 0, 'second edit within throttle window must stay silent');
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

test('session.created banner surfaces pending handoffs and stays silent without them', async () => {
  const root = mktmp();
  try {
    const hooks = await loadPluginHooks(root);
    const silent = await captureLogs(() => hooks['session.created']());
    assert.equal(silent.logs.length, 0, 'no inbox → no banner');
    fs.mkdirSync(path.join(root, '.momentum', 'inbox'), { recursive: true });
    fs.writeFileSync(path.join(root, '.momentum', 'inbox', 'handoff-001.md'), '# handoff');
    const banner = await captureLogs(() => hooks['session.created']());
    assert.equal(banner.logs.length, 1, 'pending handoff → one banner line');
    assert.match(banner.logs[0], /handoff-001\.md/);
    assert.match(banner.logs[0], /continue/);
  } finally {
    rmrf(root);
  }
});
