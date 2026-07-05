'use strict';

/**
 * `momentum waves` — render the wave plan at any scale (Phase 21c,
 * FEAT-028 — ADR-0003).
 *
 *   momentum waves                 phase scale: non-complete phases from
 *                                  overview.md frontmatter (`deps:`, OKF
 *                                  bundle) — legacy index.json fallback
 *   momentum waves --tasks [ref]   task scale: group waves for a tasks.md —
 *                                  ref = phase id or a tasks.md path;
 *                                  default = the phase bound to the current
 *                                  branch (Rule 15), fallback status.md
 *   momentum waves --json          machine shape (unstable, internal)
 *
 * Waves feed lanes: wave-1 nodes print suggested `momentum lanes open`
 * commands. Cross-repo (ecosystem) waves stay with `momentum swarm`,
 * which consumes the same engine.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MOMENTUM_ROOT = path.resolve(__dirname, '..');
const { computeWaveLayers } = require(path.join(MOMENTUM_ROOT, 'core', 'waves', 'lib', 'waves'));
const graphs = require(path.join(MOMENTUM_ROOT, 'core', 'waves', 'lib', 'plan-graph'));

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return res.status === 0 ? res.stdout.trim() : null;
}

/** Resolve the tasks.md to plan from a ref (phase id, path, or branch binding). */
function resolveTasksFile(cwd, ref) {
  const root = git(cwd, 'rev-parse', '--show-toplevel');
  if (!root) return { error: 'not inside a git repository' };
  if (ref) {
    const asPath = path.resolve(cwd, ref);
    if (fs.existsSync(asPath) && asPath.endsWith('.md')) return { file: asPath, label: ref };
    const asPhase = path.join(root, 'specs', 'phases', ref, 'tasks.md');
    if (fs.existsSync(asPhase)) return { file: asPhase, label: ref };
    return { error: `cannot resolve '${ref}' to a phase or tasks.md path` };
  }
  // Rule 15 binding: phase-* branch with a matching phase dir.
  const branch = git(cwd, 'symbolic-ref', '--short', 'HEAD');
  if (branch && /^phase-/.test(branch)) {
    const f = path.join(root, 'specs', 'phases', branch, 'tasks.md');
    if (fs.existsSync(f)) return { file: f, label: branch };
  }
  // Fallback: first status.md Active Phase row with an existing dir.
  try {
    const status = fs.readFileSync(path.join(root, 'specs', 'status.md'), 'utf8');
    const section = status.split(/^## Active Phase/m)[1] || '';
    const tokens = [...section.split(/^## /m)[0].matchAll(/`(phase-[A-Za-z0-9._-]+)`/g)].map((m) => m[1]);
    for (const t of tokens) {
      const f = path.join(root, 'specs', 'phases', t, 'tasks.md');
      if (fs.existsSync(f)) return { file: f, label: `${t} (status.md fallback)` };
    }
  } catch { /* no status.md */ }
  return { error: 'no tasks.md resolvable — pass a phase id or path: momentum waves --tasks <ref>' };
}

function render(waves, { json, kind, suggest }) {
  if (json) {
    console.log(JSON.stringify({ unstable: true, kind, waves }, null, 2));
    return;
  }
  if (waves.length === 0) {
    console.log(`no pending ${kind} — nothing to schedule`);
    return;
  }
  for (const w of waves) {
    console.log(`wave ${w.index}: ${w.nodes.join('  ')}`);
  }
  if (suggest && waves[0]) {
    console.log('');
    console.log('wave 1 can start now — open a lane per node:');
    for (const n of waves[0].nodes) {
      console.log(`  momentum lanes open ${suggest(n)}`);
    }
  }
}

function runWaves(argv, cwd = process.cwd()) {
  const json = argv.includes('--json');
  const args = argv.filter((a) => a !== '--json');

  if (args[0] === '--help' || args[0] === '-h' || args[0] === 'help') {
    console.log(`momentum waves — wave plan from dependency annotations (one engine, every scale)

  momentum waves                 phase scale (overview.md frontmatter "deps"; complete = satisfied)
  momentum waves --tasks [ref]   task-group scale ("## Group N — t (deps: G0)" in tasks.md;
                                 fully-checked groups = satisfied); ref = phase id | path;
                                 default = the phase bound to your branch (Rule 15)
  --json                         machine shape (unstable, internal)

Waves feed lanes (momentum lanes open …) and land sequentially (momentum
lanes land). Cross-repo waves: momentum swarm (same engine).`);
    return 0;
  }

  try {
    if (args[0] === '--tasks') {
      const resolved = resolveTasksFile(cwd, args[1]);
      if (resolved.error) {
        console.error(`✗ ${resolved.error}`);
        return 1;
      }
      const graph = graphs.taskGraph(resolved.file);
      if (!graph || graph.groups.length === 0) {
        console.error(`✗ no "## Group …" headings found in ${resolved.file}`);
        return 1;
      }
      console.log(`task-group waves for ${resolved.label}:`);
      const satisfied = graph.groups.filter((g) => g.satisfied).map((g) => g.id);
      if (satisfied.length) console.log(`(satisfied, dropped: ${satisfied.join(', ')})`);
      const waves = graph.nodes.length
        ? computeWaveLayers(graph.nodes, graph.edges, { label: 'waves --tasks' })
        : [];
      render(waves, { json, kind: 'task groups', suggest: null });
      return 0;
    }

    const root = git(cwd, 'rev-parse', '--show-toplevel');
    if (!root) {
      console.error('✗ not inside a git repository');
      return 1;
    }
    const graph = graphs.phaseGraph(root);
    if (!graph) {
      console.error('✗ no phase metadata found (specs/phases/*/overview.md frontmatter, or legacy specs/phases/index.json)');
      return 1;
    }
    console.log(`phase waves (non-complete phases; ${graph.source} "deps"):`);
    const waves = graph.nodes.length
      ? computeWaveLayers(graph.nodes, graph.edges, { label: 'waves' })
      : [];
    render(waves, { json, kind: 'phases', suggest: (n) => n });
    return 0;
  } catch (err) {
    console.error(`✗ ${err.message}`);
    return 1;
  }
}

module.exports = { runWaves };
