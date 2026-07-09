#!/usr/bin/env node
'use strict';

// Phase 23 / ADR-0004 — single-source instruction generation.
//
// Assembles each adapter's primary instruction template from the canonical
// fragments so the full detailed rules (Red Flags, anti-rationalization
// counters, Rule 13) ship identically to every agent surface:
//
//   header (adapter) → navigation (core) → surfaces (adapter, optional)
//     → rules body (core, vars rendered) → Project Extensions tail
//
// Sources:
//   core/instructions/navigation.md
//   core/instructions/rules-body.md          ({{TASK_TOOL}} / {{TASK_TOOL_NAME}})
//   adapters/<agent>/instructions/header.md
//   adapters/<agent>/instructions/surfaces.md (optional)
//   adapters/<agent>/instructions/vars.json
//
// Targets (committed — regenerate, never hand-edit):
//   core/specs-templates/CLAUDE.md            (claude-code)
//   adapters/codex/instructions/AGENTS.md
//   adapters/antigravity/instructions/AGENTS.md
//
// Usage:  node scripts/generate-instructions.js [--check]
//   --check: exit 1 if any committed target differs from the generated
//            content (the drift guard the suite runs); writes nothing.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const TARGETS = [
  { agent: 'claude-code', target: ['core', 'specs-templates', 'CLAUDE.md'] },
  { agent: 'codex', target: ['adapters', 'codex', 'instructions', 'AGENTS.md'] },
  { agent: 'antigravity', target: ['adapters', 'antigravity', 'instructions', 'AGENTS.md'] },
  { agent: 'opencode', target: ['adapters', 'opencode', 'instructions', 'AGENTS.md'] },
];

const MARKER_COMMENT = [
  '<!-- momentum-managed (generated) — regenerate with `npm run generate-instructions`',
  '     in the momentum repo; sources: core/instructions/ + adapters/<agent>/instructions/.',
  "     Everything above '## Project Extensions' may be replaced by `momentum upgrade`. -->",
].join('\n');

// Phase 28 (ADR-0010): the instruction file is a projection of specs/. Its
// `## Project Extensions` section is a managed POINTER to specs/project-rules.md
// (the single shared home for project-specific prose) — NOT an authoring surface.
// Kept byte-identical to core/lib/project-rules.js renderPointerBlock().
const EXTENSIONS_TAIL = [
  '---',
  '',
  '## Project Extensions',
  '',
  '<!-- momentum:project-rules-pointer -->',
  '> **Project-specific rules live in `specs/project-rules.md`** — read it now.',
  '> Session-start self-audits, project constraints, and any project-specific',
  '> guidance are there, shared identically by every agent (ADR-0010). This',
  '> section is a momentum-managed pointer; edit `specs/project-rules.md`, not',
  '> this file.',
].join('\n');

function readFragment(rel) {
  return fs.readFileSync(path.join(ROOT, ...rel), 'utf8');
}

function renderBody(body, vars) {
  let out = body;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  const leftover = out.match(/\{\{[A-Z_]+\}\}/);
  if (leftover) {
    throw new Error(`unrendered placeholder ${leftover[0]} — add it to vars.json`);
  }
  return out;
}

/** Generate one adapter's instruction content (pure; no I/O beyond reads). */
function generateFor(agent) {
  const instrDir = ['adapters', agent, 'instructions'];
  const header = readFragment([...instrDir, 'header.md']);
  const vars = JSON.parse(readFragment([...instrDir, 'vars.json']));
  const navigation = readFragment(['core', 'instructions', 'navigation.md']);
  const body = renderBody(readFragment(['core', 'instructions', 'rules-body.md']), vars);

  const surfacesPath = path.join(ROOT, ...instrDir, 'surfaces.md');
  const surfaces = fs.existsSync(surfacesPath) ? fs.readFileSync(surfacesPath, 'utf8') : null;

  const parts = [MARKER_COMMENT, header, navigation];
  if (surfaces) parts.push(surfaces);
  parts.push(body, EXTENSIONS_TAIL);

  return parts.map((p) => p.replace(/\s+$/, '')).join('\n\n') + '\n';
}

/** Generate all targets. Returns [{agent, targetRel, content}]. */
function generateAll() {
  return TARGETS.map(({ agent, target }) => ({
    agent,
    targetRel: target.join('/'),
    targetPath: path.join(ROOT, ...target),
    content: generateFor(agent),
  }));
}

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

module.exports = { generateAll, generateFor, TARGETS, MARKER_COMMENT };

if (require.main === module) {
  main();
}
