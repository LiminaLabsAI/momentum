'use strict';

/**
 * Phase 29 / ADR-0011 — the instruction file is a projection of
 * (principal constants × per-agent variation manifest). These tests pin the
 * structural invariants the ADR promises:
 *   1. the rules-body spine is BYTE-IDENTICAL across every agent + surface
 *   2. the header is one scaffold; only the display name varies
 *   3. OCP — a synthetic adapter generates correctly with ZERO generator edits
 *   4. multi-agent AGENTS.md composition (neutral spine + one section per agent)
 *   5. manifest.surface agrees with the adapter's install destination
 *   6. ecosystem detection reads the ADR-0007 agents map (not the removed field)
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf } = require('./_helpers');
const compose = require('../core/lib/instruction-compose');
const eco = require('../bin/ecosystem');

const ROOT = path.resolve(__dirname, '..');
const outputs = compose.generateAll(ROOT);

/** The managed Rules region: `## Autonomous Behaviors` → the project-rules pointer. */
function spine(content) {
  const start = content.indexOf('## Autonomous Behaviors');
  const end = content.indexOf('<!-- momentum:project-rules-pointer -->');
  assert.ok(start !== -1 && end !== -1 && end > start, 'both spine markers present');
  return content.slice(start, end);
}

test('1. the rules-body spine is byte-identical across every agent + surface', () => {
  const first = spine(outputs[0].content);
  for (const o of outputs) {
    assert.equal(spine(o.content), first, `${o.targetRel}: spine differs from ${outputs[0].targetRel}`);
  }
});

test('2. the header is one scaffold; only the display name varies', () => {
  for (const o of outputs) {
    const line = o.content.split('\n').find((l) => l.startsWith('> '));
    assert.equal(
      line,
      `> ${o.manifest.displayName} configuration for this momentum-managed project.`,
      `${o.targetRel}: header not the neutral scaffold`,
    );
  }
});

test('3. OCP — a synthetic adapter generates correctly with no generator edits', () => {
  const tmp = mktmp('momentum-ocp-');
  try {
    // Minimal repo-shaped root: real Tier-1 constants + a brand-new adapter.
    fs.mkdirSync(path.join(tmp, 'core', 'instructions'), { recursive: true });
    for (const f of ['navigation.md', 'rules-body.md']) {
      fs.copyFileSync(path.join(ROOT, 'core', 'instructions', f), path.join(tmp, 'core', 'instructions', f));
    }
    const dir = path.join(tmp, 'adapters', 'synthexample', 'instructions');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({
      id: 'synthexample',
      displayName: 'SynthExample',
      surface: 'agents-md',
      taskTool: 'the **synth** tool',
      taskToolName: 'The synth tool',
      hasSurfaceDelta: false,
    }));

    const discovered = compose.discoverAgents(tmp);
    assert.deepEqual(discovered, ['synthexample'], 'auto-discovery finds the new adapter');

    const out = compose.generateFor(tmp, 'synthexample');
    assert.equal(out.targetRel, 'adapters/synthexample/instructions/AGENTS.md');
    assert.match(out.content, /^> SynthExample configuration for this momentum-managed project\.$/m);
    assert.match(out.content, /SynthExample's task tool is the \*\*synth\*\* tool/);
    for (let n = 1; n <= 15; n++) {
      assert.match(out.content, new RegExp(`^### Rule ${n}:`, 'm'), `Rule ${n} present`);
    }
    assert.ok(!out.content.includes('{{'), 'no unrendered placeholders');
    assert.equal(spine(out.content), spine(outputs[0].content), 'synthetic agent shares the neutral spine');
  } finally {
    rmrf(tmp);
  }
});

test('4. multi-agent AGENTS.md composes a neutral spine + one section per agent', () => {
  const content = compose.composeInstruction(ROOT, ['codex', 'opencode']);
  assert.match(content, /serves 2 agents \(Codex, opencode\)/, 'neutral multi-agent header');
  assert.match(content, /## Momentum Recipes — Codex Skills/, 'Codex integration present');
  assert.match(content, /## Momentum Recipes — opencode Commands/, 'opencode integration present');
  assert.equal((content.match(/## In-Session Task Tool/g) || []).length, 2, 'one task-tool note per agent');
  // Spine appears exactly once and is identical to the single-agent projection.
  assert.equal((content.match(/## Autonomous Behaviors/g) || []).length, 1, 'one rules body');
  assert.equal((content.match(/## Navigation \(Where to Find Things\)/g) || []).length, 1, 'one navigation');
  const codexOnly = outputs.find((o) => o.agent === 'codex').content;
  assert.equal(spine(content), spine(codexOnly), 'composed spine == single-agent spine');
});

test('5. manifest.surface agrees with the adapter install destination', () => {
  for (const id of compose.discoverAgents(ROOT)) {
    const m = compose.readManifest(ROOT, id);
    const adapter = require(path.join(ROOT, 'adapters', id, 'adapter.js'));
    assert.equal(
      adapter.primaryInstruction.destination.join('/'),
      compose.surfaceDestination(m.surface),
      `${id}: adapter.js destination disagrees with manifest.surface`,
    );
  }
});

test('6. detectMemberAgent reads the ADR-0007 agents map (not AGENTS.md ⇒ codex)', () => {
  const tmp = mktmp('momentum-detect-');
  try {
    const write = (agents) => {
      const dir = path.join(tmp, '.momentum');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'installed.json'), JSON.stringify({ version: '1.0.0', agents }));
    };
    // A single opencode repo must NOT be misidentified as codex.
    write({ opencode: { version: '1.0.0', files: [] } });
    assert.equal(eco.detectMemberAgent(tmp), 'opencode');
    // claude-code is the preferred primary when present.
    write({ opencode: { version: '1', files: [] }, 'claude-code': { version: '1', files: [] } });
    assert.equal(eco.detectMemberAgent(tmp), 'claude-code');
    // Two AGENTS.md agents → deterministic (alphabetical) primary.
    write({ opencode: { version: '1', files: [] }, codex: { version: '1', files: [] } });
    assert.equal(eco.detectMemberAgent(tmp), 'codex');
  } finally {
    rmrf(tmp);
  }
});
