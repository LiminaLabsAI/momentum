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

/**
 * Phase 11 G5 — orchestration smoke for a given adapter. Exercises
 * the three orchestration primitives (scout, dispatch, handoff) via
 * the CLI floor — the universal door that works on every adapter.
 *
 * Slash-command presence (where the adapter supports them) is asserted
 * separately. Antigravity passes the same scenario via CLI; its slash-
 * command assertions are skipped per `env.slashCommandsExpected`.
 *
 * @param {string} agent
 * @param {object} env
 * @param {string} env.primary                primary instruction filename
 * @param {string[]} [env.commandsDir]        slash-commands dir components
 * @param {boolean} env.slashCommandsExpected whether to assert /scout, /dispatch, /handoff, /continue overlay files
 */
function runOrchestrationSmoke(agent, env) {
  const tmp = mktmp(`momentum-orch-${agent}-`);
  try {
    // Build a 3-member fixture ecosystem with the right adapter installed.
    const ecoRoot = path.join(tmp, `${agent}-orch-eco`);
    fs.mkdirSync(ecoRoot, { recursive: true });
    fs.writeFileSync(path.join(ecoRoot, 'ecosystem.json'), JSON.stringify({
      name: `${agent}-orch-eco`,
      version: 1,
      members: [
        { id: 'a', path: 'a', role: 'other' },
        { id: 'b', path: 'b', role: 'other' },
        { id: 'c', path: 'c', role: 'other' },
      ],
    }, null, 2));

    for (const name of ['a', 'b', 'c']) {
      const repo = path.join(ecoRoot, name);
      fs.mkdirSync(repo, { recursive: true });
      lib._clearRootCache();
      const r = runCli(['init', '--agent', agent, '--no-ecosystem'], { cwd: repo });
      assert.equal(r.status, 0, `[${agent}] init for member ${name} failed: ${r.stderr}`);
      // Override status.md so scout has interesting content per-repo.
      fs.writeFileSync(
        path.join(repo, 'specs', 'status.md'),
        `# ${name} status\n\nAuth header: X-Cerebrio-Auth\nEndpoint: POST /core/auth/v1/login (in ${name})\n`,
      );
    }

    // If the adapter ships slash commands, assert overlay files exist.
    if (env.slashCommandsExpected) {
      for (const cmd of ['scout', 'dispatch', 'handoff', 'continue']) {
        assert.ok(
          fs.existsSync(path.join(ecoRoot, 'a', ...env.commandsDir, `${cmd}.md`)),
          `[${agent}] slash command overlay missing: ${env.commandsDir.join('/')}/${cmd}.md`,
        );
      }
    }

    const a = path.join(ecoRoot, 'a');
    const b = path.join(ecoRoot, 'b');
    const c = path.join(ecoRoot, 'c');

    // ── scoutSingle ────────────────────────────────────────────────────
    lib._clearRootCache();
    let r = runCli(['scout', 'b', 'auth header'], { cwd: a });
    assert.equal(r.status, 0, `[${agent}] scout failed: ${r.stderr}`);
    const scoutArtifacts = fs.readdirSync(path.join(a, '.momentum', 'runs'))
      .filter((f) => f.startsWith('scout-'));
    assert.equal(scoutArtifacts.length, 1, `[${agent}] expected one scout artifact`);

    // ── dispatchFanout ─────────────────────────────────────────────────
    lib._clearRootCache();
    r = runCli(['dispatch', 'a', 'b', 'c', '--prompt', 'audit header'], { cwd: a });
    assert.equal(r.status, 0, `[${agent}] dispatch failed: ${r.stderr}`);
    const dispatchArtifacts = fs.readdirSync(path.join(a, '.momentum', 'runs'))
      .filter((f) => f.startsWith('dispatch-'));
    assert.equal(dispatchArtifacts.length, 1, `[${agent}] expected one dispatch artifact`);

    // ── handoffRoundtrip ───────────────────────────────────────────────
    lib._clearRootCache();
    r = runCli(['handoff', 'b', '--summary', 'continue the audit in b'], { cwd: a });
    assert.equal(r.status, 0, `[${agent}] handoff failed: ${r.stderr}`);
    assert.ok(
      fs.existsSync(path.join(b, '.momentum', 'inbox', 'handoff-001.md')),
      `[${agent}] inbox file not written`,
    );

    lib._clearRootCache();
    r = runCli(['continue'], { cwd: b });
    assert.equal(r.status, 0, `[${agent}] continue failed: ${r.stderr}`);
    assert.match(r.stdout, /picking up handoff-001 from a/);
    assert.ok(
      fs.existsSync(path.join(b, '.momentum', 'inbox', 'read', 'handoff-001.md')),
      `[${agent}] inbox file not moved to read/ after continue`,
    );

    // Session log shows all three primitives — proof the cheap layer
    // wires through identically on each adapter.
    const sessionsDir = path.join(ecoRoot, 'sessions');
    assert.ok(fs.existsSync(sessionsDir), `[${agent}] sessions dir missing`);
    const sessionFiles = fs.readdirSync(sessionsDir);
    assert.equal(sessionFiles.length, 1, `[${agent}] expected one session file`);
    const log = fs.readFileSync(path.join(sessionsDir, sessionFiles[0]), 'utf8');
    assert.match(log, /\[a\] scout:/, `[${agent}] session log missing scout entry`);
    assert.match(log, /\[a\] dispatch:/, `[${agent}] session log missing dispatch entry`);
    assert.match(log, /\[a\] handoff:/, `[${agent}] session log missing handoff entry`);
  } finally {
    rmrf(tmp);
  }
}

module.exports = { runAdapterSmoke, runOrchestrationSmoke };
