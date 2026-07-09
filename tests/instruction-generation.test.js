'use strict';

// Phase 23 / ADR-0004 — single-source instruction generation.
//
// (1) Drift guard: the three committed primary-instruction templates must be
//     byte-identical to what `scripts/generate-instructions.js` produces from
//     the canonical sources. A red run here means someone edited a generated
//     file directly — edit core/instructions/ (or the adapter fragments) and
//     run `npm run generate-instructions`.
// (2) Invariants: every output carries the COMPLETE rulebook — all 15 rules,
//     the Red Flags matrices, anti-rationalization counters, Rule 13 — with
//     no unrendered placeholders and no reference to the retired
//     `.agent/rules/project.md` pointer file.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { generateAll, MARKER_COMMENT } = require('../scripts/generate-instructions');

const outputs = generateAll();

test('drift guard — committed instruction templates match generated content byte-for-byte', () => {
  for (const o of outputs) {
    const committed = fs.readFileSync(o.targetPath, 'utf8');
    assert.equal(
      committed,
      o.content,
      `${o.targetRel} drifted from sources — run: npm run generate-instructions`,
    );
  }
});

test('every output carries the complete rulebook (Rules 1–15, Red Flags, counters)', () => {
  for (const o of outputs) {
    for (let n = 1; n <= 15; n++) {
      assert.match(o.content, new RegExp(`^### Rule ${n}:`, 'm'), `${o.targetRel}: Rule ${n} missing`);
    }
    const redFlags = (o.content.match(/#### Red Flags/g) || []).length;
    assert.ok(redFlags >= 8, `${o.targetRel}: expected >=8 Red Flags matrices, got ${redFlags}`);
    assert.ok(
      (o.content.match(/#### Anti-Rationalization Counters/g) || []).length >= 6,
      `${o.targetRel}: anti-rationalization counters missing`,
    );
    assert.match(o.content, /### Rule 13: Test-Driven Development/, `${o.targetRel}: Rule 13 body missing`);
  }
});

test('outputs are clean — no placeholders, no retired pointer, marker + extensions intact', () => {
  for (const o of outputs) {
    assert.ok(!o.content.includes('{{'), `${o.targetRel}: unrendered placeholder`);
    assert.ok(
      !o.content.includes('.agent/rules/project.md'),
      `${o.targetRel}: references the retired pointer file`,
    );
    assert.ok(o.content.startsWith(MARKER_COMMENT), `${o.targetRel}: generated marker missing`);
    assert.match(o.content, /\n## Project Extensions\n/, `${o.targetRel}: extensions marker missing`);
    assert.match(o.content, /^# Project Rules: <Project Name>$/m, `${o.targetRel}: title placeholder missing`);
  }
});

test('per-adapter content landed in the right output', () => {
  const byAgent = Object.fromEntries(outputs.map((o) => [o.agent, o.content]));
  assert.match(byAgent['claude-code'], /Claude Code configuration/);
  assert.match(byAgent['claude-code'], /\*\*TodoWrite\*\*/);
  assert.match(byAgent['codex'], /Codex configuration/);
  assert.match(byAgent['codex'], /## Codex Hooks/);
  assert.match(byAgent['antigravity'], /Antigravity configuration/);
  assert.match(byAgent['antigravity'], /Antigravity-native layout/);
  // The retired rules dir must not be advertised in the antigravity layout table.
  assert.ok(!byAgent['antigravity'].includes('| `.agent/rules/` |'));
});

// BUG-027 guard (Phase 29): a generated recipe row once shipped without its
// trailing `|`. Assert every markdown table row in every generated instruction
// file is well-formed — trimmed, it starts AND ends with `|` (fenced code blocks
// excluded).
test('every markdown table row in generated instruction files is well-formed (BUG-027 guard)', () => {
  for (const o of outputs) {
    let inFence = false;
    o.content.split('\n').forEach((line, idx) => {
      const t = line.trim();
      if (t.startsWith('```')) { inFence = !inFence; return; }
      if (inFence || !t.startsWith('|')) return;
      assert.ok(
        t.endsWith('|'),
        `${o.targetRel}:${idx + 1} malformed table row (missing trailing |): ${t}`,
      );
    });
  }
});
