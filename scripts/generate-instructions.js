#!/usr/bin/env node
'use strict';

// Phase 23 / ADR-0004 → Phase 29 / ADR-0011 — single-source instruction generation.
//
// Thin CLI wrapper around the shipped core/lib/instruction-compose.js (which
// bin/momentum.js also uses at install time for multi-agent AGENTS.md). This
// script writes the committed per-agent templates and provides a --check drift
// guard for the suite.
//
// Sources (auto-discovered — add an adapter dir, no edit here):
//   core/instructions/navigation.md
//   core/instructions/rules-body.md                (agent-neutral; no task-tool token)
//   adapters/<agent>/instructions/manifest.json     (id, displayName, surface, taskTool, …)
//   adapters/<agent>/instructions/surfaces.md        (optional integration delta)
//
// Targets (committed — regenerate, never hand-edit):
//   core/specs-templates/CLAUDE.md                  (surface: claude-md)
//   adapters/<agent>/instructions/AGENTS.md          (surface: agents-md)
//
// Usage:  node scripts/generate-instructions.js [--check]
//   --check: exit 1 if any committed target differs from generated content.

const fs = require('fs');
const path = require('path');

const compose = require('../core/lib/instruction-compose');

const ROOT = path.join(__dirname, '..');
const { MARKER_COMMENT } = compose;

const generateAll = () => compose.generateAll(ROOT);
const generateFor = (id) => compose.generateFor(ROOT, id);
const discoverAgents = () => compose.discoverAgents(ROOT);

function main() {
  const check = process.argv.includes('--check');
  let drift = 0;
  for (const t of generateAll()) {
    const existing = fs.existsSync(t.targetPath) ? fs.readFileSync(t.targetPath, 'utf8') : null;
    if (existing === t.content) {
      console.log(`  = ${t.targetRel} up to date`);
      continue;
    }
    if (check) {
      console.log(`  ✗ ${t.targetRel} DRIFTED from sources — run: npm run generate-instructions`);
      drift++;
      continue;
    }
    fs.writeFileSync(t.targetPath, t.content);
    console.log(`  ↻ regenerated: ${t.targetRel}`);
  }
  if (drift) process.exit(1);
}

module.exports = { generateAll, generateFor, discoverAgents, MARKER_COMMENT };

if (require.main === module) {
  main();
}
