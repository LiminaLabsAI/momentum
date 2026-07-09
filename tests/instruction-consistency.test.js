'use strict';

/**
 * Phase 28 G4 — the structural guarantee of ADR-0010: every instruction file is
 * a projection of the same sources, so their MANAGED regions are identical
 * across adapters except for declared per-adapter substitutions. This guard
 * fails if CLAUDE.md and AGENTS.md ever diverge again in managed content.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { generateAll } = require('../scripts/generate-instructions');

const outputs = generateAll();
const claude = outputs.find((o) => o.targetRel.endsWith('CLAUDE.md'));
const agentsFiles = outputs.filter((o) => o.targetRel.endsWith('AGENTS.md'));

/** The managed Rules region: `## Autonomous Behaviors` → the project-rules pointer. */
function managedRules(content) {
  const start = content.indexOf('## Autonomous Behaviors');
  const end = content.indexOf('<!-- momentum:project-rules-pointer -->');
  assert.ok(start !== -1 && end !== -1 && end > start, 'both markers present');
  return content.slice(start, end);
}

// The one declared per-adapter substitution is the in-session task-tool
// sentence (Rule 2 body + its anti-rationalization counter). Each adapter
// phrases it entirely differently, so identify those lines by content and
// permit ONLY them to differ — any other divergence is real drift.
const TASKTOOL_LINE = /in-session task progress|is in-session only; `tasks\.md`/;

test('CLAUDE.md and every AGENTS.md carry an IDENTICAL managed Rules region except the task-tool line', () => {
  const cLines = managedRules(claude.content).split('\n');
  for (const a of agentsFiles) {
    const aLines = managedRules(a.content).split('\n');
    assert.equal(aLines.length, cLines.length,
      `${a.targetRel}: managed region line count differs from CLAUDE.md (${aLines.length} vs ${cLines.length}) — structural drift`);
    for (let i = 0; i < cLines.length; i++) {
      if (cLines[i] === aLines[i]) continue;
      assert.ok(
        TASKTOOL_LINE.test(cLines[i]) || TASKTOOL_LINE.test(aLines[i]),
        `${a.targetRel} diverged from CLAUDE.md at line ${i} (not the task-tool substitution):\n  CLAUDE: ${cLines[i]}\n  ${a.targetRel}: ${aLines[i]}`,
      );
    }
  }
});

test('every instruction file ends with the project-rules pointer (ADR-0010), no authoring surface', () => {
  for (const o of outputs) {
    assert.match(o.content, /<!-- momentum:project-rules-pointer -->/, `${o.targetRel} missing the pointer`);
    assert.match(o.content, /specs\/project-rules\.md/, `${o.targetRel} must point to project-rules.md`);
    // the retired boilerplate must be gone
    assert.doesNotMatch(o.content, /Everything below this heading is preserved/, `${o.targetRel} still has the old authoring boilerplate`);
  }
});
