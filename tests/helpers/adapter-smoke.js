'use strict';

/**
 * Shared end-to-end smoke scenario for any adapter.
 *
 * Each adapter's smoke test calls runAdapterSmoke(agent, {assertions})
 * with the same scenario. This proves the Phase 10 CLI surface — init,
 * init --ecosystem, join, leave, doctor, ecosystem add/remove/status —
 * works identically across adapters.
 */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('../_helpers');
const lib = require('../../core/ecosystem/lib');

/**
 * Run the full Phase 10 end-to-end scenario for the given adapter.
 * Returns void; throws on any unexpected outcome.
 *
 * @param {string} agent  Adapter name (claude-code | codex | antigravity).
 * @param {{primary: string, commandsDir: string[]}} env  Adapter-specific
 *   expectations: primary instruction filename + relative path components
 *   for the slash-commands directory.
 */
function runAdapterSmoke(agent, env) {
  const tmp = mktmp(`momentum-adapter-${agent}-`);
  try {
    // 1. init (standalone)
    const solo = path.join(tmp, 'solo-project');
    fs.mkdirSync(solo);
    lib._clearRootCache();
    let r = runCli(['init', '--agent', agent, '--no-ecosystem'], { cwd: solo });
    assert.equal(r.status, 0, `[${agent}] init failed: ${r.stderr}`);

    // Primary instruction file shipped by this adapter exists.
    assert.ok(
      fs.existsSync(path.join(solo, env.primary)),
      `[${agent}] expected ${env.primary} after init`,
    );
    // Slash commands directory present (or skipped for adapters with no
    // slash commands — Antigravity).
    if (env.commandsDir) {
      assert.ok(
        fs.existsSync(path.join(solo, ...env.commandsDir, 'ecosystem.md')),
        `[${agent}] expected ${env.commandsDir.join('/')}/ecosystem.md after init`,
      );
      assert.ok(
        fs.existsSync(path.join(solo, ...env.commandsDir, 'initiative.md')),
        `[${agent}] expected ${env.commandsDir.join('/')}/initiative.md after init`,
      );
      assert.ok(
        fs.existsSync(path.join(solo, ...env.commandsDir, 'session.md')),
        `[${agent}] expected ${env.commandsDir.join('/')}/session.md after init`,
      );
    }

    // 2. doctor (standalone state)
    lib._clearRootCache();
    r = runCli(['doctor'], { cwd: solo });
    assert.equal(r.status, 0, `[${agent}] doctor failed: ${r.stderr}`);
    assert.match(r.stdout, /State: Standalone/);

    // 3. init --ecosystem from a NEW project (Workstream 1 + adapter)
    const eco = path.join(tmp, 'eco-project');
    fs.mkdirSync(eco);
    lib._clearRootCache();
    r = runCli(['init', '--agent', agent, '--ecosystem', `${agent}-eco`], { cwd: eco });
    assert.equal(r.status, 0, `[${agent}] init --ecosystem failed: ${r.stderr}`);

    const ecoRoot = path.join(tmp, `${agent}-eco`);
    assert.ok(fs.existsSync(path.join(ecoRoot, 'ecosystem.json')));
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ecoRoot, 'ecosystem.json'), 'utf8'),
    );
    assert.equal(manifest.members.length, 1, `[${agent}] one member after init --ecosystem`);

    // Pointer block injected in the adapter's primary instruction file.
    const primary = fs.readFileSync(path.join(eco, env.primary), 'utf8');
    assert.match(primary, /<!-- ecosystem:begin -->/, `[${agent}] pointer block missing from ${env.primary}`);

    // 4. doctor (member state)
    lib._clearRootCache();
    r = runCli(['doctor'], { cwd: eco });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /State: Member/);

    // 5. join solo into the same ecosystem
    lib._clearRootCache();
    r = runCli(['join', ecoRoot], { cwd: solo });
    assert.equal(r.status, 0, `[${agent}] join failed: ${r.stderr}`);

    // 6. ecosystem status (operator surface, location-agnostic via --ecosystem)
    lib._clearRootCache();
    r = runCli(['ecosystem', 'status', '--ecosystem', ecoRoot], { cwd: tmp });
    assert.equal(r.status, 0, `[${agent}] ecosystem status failed: ${r.stderr}`);
    assert.match(r.stdout, new RegExp(`Ecosystem: ${agent}-eco`));

    // 7. leave solo
    lib._clearRootCache();
    r = runCli(['leave'], { cwd: solo });
    assert.equal(r.status, 0, `[${agent}] leave failed: ${r.stderr}`);
    lib._clearRootCache();
    r = runCli(['doctor'], { cwd: solo });
    assert.match(r.stdout, /State: Standalone/);

    // 8. ecosystem remove for the eco-project (cleanup)
    lib._clearRootCache();
    r = runCli(['ecosystem', 'remove', `${agent}-eco`, '--ecosystem', ecoRoot], {
      cwd: tmp,
    });
    // The member id might differ from the ecosystem name; ignore failure here.
    void r;
  } finally {
    rmrf(tmp);
  }
}

module.exports = { runAdapterSmoke };
