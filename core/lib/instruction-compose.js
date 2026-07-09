'use strict';

// ADR-0011 — the instruction file is a projection of
// (principal constants × per-agent variation manifest).
//
// Pure assembly logic, shipped in core/ so BOTH build-time generation
// (scripts/generate-instructions.js) and install-time multi-agent AGENTS.md
// composition (bin/momentum.js) use ONE code path. Every function takes
// `root` = the momentum package/repo root that holds core/ + adapters/.
//
// Three tiers:
//   1. Principal constants (neutral spine): core/instructions/navigation.md +
//      rules-body.md — byte-identical across every agent + surface.
//   2. Variation manifest: adapters/<id>/instructions/manifest.json.
//   3. Surface delta: adapters/<id>/instructions/surfaces.md (optional).
//
// Assembly:
//   marker → header → navigation → (per agent: surfaces? + task-tool note)
//     → neutral rules body → Project Extensions pointer tail (ADR-0010)

const fs = require('fs');
const path = require('path');

const MARKER_COMMENT = [
  '<!-- momentum-managed (generated) — regenerate with `npm run generate-instructions`',
  '     in the momentum repo; sources: core/instructions/ + adapters/<agent>/instructions/.',
  "     Everything above '## Project Extensions' may be replaced by `momentum upgrade`. -->",
].join('\n');

// ADR-0010: `## Project Extensions` is a managed POINTER to specs/project-rules.md,
// not an authoring surface. Kept byte-identical to core/lib/project-rules.js.
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

function readFragment(root, rel) {
  return fs.readFileSync(path.join(root, ...rel), 'utf8');
}

/** Discover every adapter that ships an instruction manifest (OCP: add a dir, no edits). */
function discoverAgents(root) {
  const dir = path.join(root, 'adapters');
  return fs
    .readdirSync(dir)
    .filter((id) => fs.existsSync(path.join(dir, id, 'instructions', 'manifest.json')))
    .sort();
}

function readManifest(root, id) {
  const m = JSON.parse(readFragment(root, ['adapters', id, 'instructions', 'manifest.json']));
  for (const key of ['id', 'displayName', 'surface', 'taskTool', 'taskToolName']) {
    if (typeof m[key] !== 'string' || !m[key]) {
      throw new Error(`adapters/${id}/instructions/manifest.json: missing/invalid "${key}"`);
    }
  }
  if (m.id !== id) throw new Error(`manifest id "${m.id}" != adapter dir "${id}"`);
  if (m.surface !== 'claude-md' && m.surface !== 'agents-md') {
    throw new Error(`adapters/${id}: surface "${m.surface}" — expected claude-md | agents-md`);
  }
  return m;
}

/** The install destination filename implied by the surface. */
function surfaceDestination(surface) {
  if (surface === 'claude-md') return 'CLAUDE.md';
  if (surface === 'agents-md') return 'AGENTS.md';
  throw new Error(`unknown surface "${surface}"`);
}

/** Where this agent's committed (N=1) template lives, derived from its surface. */
function templatePath(id, surface) {
  if (surface === 'claude-md') return ['core', 'specs-templates', 'CLAUDE.md'];
  if (surface === 'agents-md') return ['adapters', id, 'instructions', 'AGENTS.md'];
  throw new Error(`unknown surface "${surface}" for adapter "${id}"`);
}

/** Header: single scaffold constant, agent display name(s) the only variable. */
function renderHeader(manifests) {
  const title = '# Project Rules: <Project Name>';
  if (manifests.length === 1) {
    return `${title}\n\n> ${manifests[0].displayName} configuration for this momentum-managed project.`;
  }
  const names = manifests.map((m) => m.displayName).join(', ');
  return (
    `${title}\n\n> Configuration for this momentum-managed project. This shared ` +
    `AGENTS.md serves ${manifests.length} agents (${names}); each has its own ` +
    `integration section below.`
  );
}

/** The one agent-specific line lifted out of the neutral spine (SRP). */
function renderTaskToolNote(m) {
  return [
    '## In-Session Task Tool',
    '',
    `When a rule mentions tracking in-session progress (Rule 2), ${m.displayName}'s ` +
      `task tool is ${m.taskTool} — in-session only; the durable record is ` +
      '`specs/phases/<phase>/tasks.md`.',
  ].join('\n');
}

function readSurfaces(root, m) {
  if (!m.hasSurfaceDelta) return null;
  const p = path.join(root, 'adapters', m.id, 'instructions', 'surfaces.md');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

function finalize(parts) {
  const content = parts.map((p) => p.replace(/\s+$/, '')).join('\n\n') + '\n';
  const leftover = content.match(/\{\{[A-Z_]+\}\}/);
  if (leftover) throw new Error(`unrendered placeholder ${leftover[0]}`);
  return content;
}

/**
 * Compose an instruction file for one or more agents.
 * - Single id → the committed N=1 projection (a static template).
 * - Multiple ids → neutral spine + one integration section per agent
 *   (install-time AGENTS.md when several AGENTS.md agents are installed).
 */
function composeInstruction(root, ids) {
  if (!ids.length) throw new Error('composeInstruction: no agents');
  const manifests = ids.map((id) => readManifest(root, id));
  const navigation = readFragment(root, ['core', 'instructions', 'navigation.md']);
  const body = readFragment(root, ['core', 'instructions', 'rules-body.md']);

  const parts = [MARKER_COMMENT, renderHeader(manifests), navigation];
  for (const m of manifests) {
    const surfaces = readSurfaces(root, m);
    if (surfaces) parts.push(surfaces);
    parts.push(renderTaskToolNote(m));
  }
  parts.push(body, EXTENSIONS_TAIL);
  return finalize(parts);
}

/** One committed template descriptor for a single agent. */
function generateFor(root, id) {
  const m = readManifest(root, id);
  const target = templatePath(id, m.surface);
  return {
    agent: id,
    targetRel: target.join('/'),
    targetPath: path.join(root, ...target),
    content: composeInstruction(root, [id]),
    manifest: m,
  };
}

function generateAll(root) {
  return discoverAgents(root).map((id) => generateFor(root, id));
}

module.exports = {
  MARKER_COMMENT,
  EXTENSIONS_TAIL,
  discoverAgents,
  readManifest,
  surfaceDestination,
  templatePath,
  renderHeader,
  renderTaskToolNote,
  composeInstruction,
  generateFor,
  generateAll,
};
