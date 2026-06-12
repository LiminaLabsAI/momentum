'use strict';

/**
 * `momentum swarm` subcommand dispatcher.
 *
 * Subcommands (v0.20.0):
 *   start <slug> --initiative <slug> --repos r1,r2,... --phase <phase-slug> [--mode autopilot|checkpoint]
 *   status <swarm-id>          — print board.json as JSON or rendered table
 *   tell <swarm-id> <repo> "<text>"
 *   broadcast <swarm-id> "<text>"
 *   verify <swarm-id>          — contract verifier + drift check
 *   complete <swarm-id>        — synthesize retrospective + changes/<id>.md
 *   resume <swarm-id>          — reattach this session to a swarm
 *   cancel <swarm-id>          — graceful halt
 *   budget <swarm-id> <repo> +N
 *
 * Lower-level CLI floor for the three doors: slash recipes wrap this,
 * NL inference wraps this, direct CLI is this. All three produce the
 * same on-disk artifacts.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const crypto = require('crypto');

const MOMENTUM_ROOT = path.resolve(__dirname, '..');
const conductor = require(path.join(MOMENTUM_ROOT, 'core', 'swarm', 'conductor'));
const manifestLib = require(path.join(MOMENTUM_ROOT, 'core', 'swarm', 'lib', 'manifest'));
const boardLib = require(path.join(MOMENTUM_ROOT, 'core', 'swarm', 'lib', 'board'));
const briefLib = require(path.join(MOMENTUM_ROOT, 'core', 'swarm', 'lib', 'brief'));
const ecosystemLib = require(path.join(MOMENTUM_ROOT, 'core', 'ecosystem', 'lib', 'index'));
const { findRegistration } = require(path.join(MOMENTUM_ROOT, 'core', 'ecosystem', 'lib', 'state'));

// ─────────────────────────────────────────────────────────────────────────────
// Argv parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseFlags(args, defs) {
  const out = { positional: [] };
  for (const key of Object.keys(defs)) out[key] = defs[key].default;
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    let consumed = false;
    for (const key of Object.keys(defs)) {
      const def = defs[key];
      if (a === def.flag || (def.aliases && def.aliases.includes(a))) {
        if (def.type === 'bool') {
          out[key] = true;
          i += 1;
        } else if (def.type === 'list') {
          out[key] = (args[i + 1] || '').split(',').map((s) => s.trim()).filter(Boolean);
          i += 2;
        } else {
          out[key] = args[i + 1];
          i += 2;
        }
        consumed = true;
        break;
      }
    }
    if (!consumed) {
      out.positional.push(a);
      i += 1;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ecosystem resolution
// ─────────────────────────────────────────────────────────────────────────────

function resolveEcosystemRoot(explicit) {
  if (explicit && fs.existsSync(path.join(explicit, 'ecosystem.json'))) {
    return path.resolve(explicit);
  }
  const fromCwd = ecosystemLib.findRoot(process.cwd());
  if (fromCwd) return fromCwd;
  const reg = findRegistration(process.cwd());
  if (reg && reg.rootPath) return reg.rootPath;
  throw new Error(
    'swarm: cannot locate ecosystem root. Run from inside an ecosystem ' +
    'or pass --ecosystem <path>.'
  );
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

function generateSessionId() {
  return 'sess_' + crypto.randomBytes(8).toString('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcommands
// ─────────────────────────────────────────────────────────────────────────────

function cmdStart(args) {
  const opts = parseFlags(args, {
    initiative: { flag: '--initiative' },
    repos: { flag: '--repos', type: 'list', default: [] },
    phase: { flag: '--phase' },
    mode: { flag: '--mode', default: 'checkpoint' },
    sessionId: { flag: '--session', default: null },
    ecosystem: { flag: '--ecosystem', default: null },
    spawn: { flag: '--spawn', type: 'bool', default: false },
    json: { flag: '--json', type: 'bool', default: false },
  });
  const [slug] = opts.positional;
  if (!slug) throw new Error('swarm start: <slug> required');
  if (!opts.initiative) throw new Error('swarm start: --initiative <slug> required');
  if (!opts.repos || opts.repos.length === 0) throw new Error('swarm start: --repos r1,r2,... required');
  if (!opts.phase) throw new Error('swarm start: --phase <phase-slug> required');

  const ecosystemRoot = resolveEcosystemRoot(opts.ecosystem);
  const swarmId = manifestLib.nextSwarmId(ecosystemRoot, slug);
  const sessionId = opts.sessionId || generateSessionId();
  const ts = nowIso();

  const manifest = conductor.planSwarm({
    ecosystemRoot,
    swarmId,
    initiative: opts.initiative,
    impactedRepos: opts.repos,
    phaseSlug: opts.phase,
    sessionId,
    mode: opts.mode,
    nowIso: ts,
  });
  manifestLib.writeManifest(ecosystemRoot, swarmId, manifest);
  boardLib.refreshBoard(ecosystemRoot, swarmId, ts);

  // Build (and optionally execute) Wave 1 spawn directives. Default is
  // dry-run — the platform layer or the conductor recipe handles the
  // actual spawn so the CLI floor stays platform-agnostic.
  const directives = conductor.buildSpawnDirectives({
    ecosystemRoot, swarmId, waveIndex: 1, platform: 'claude-code',
  });

  let spawnResults = null;
  if (opts.spawn) {
    spawnResults = spawnClaudeCodeSupervisors(directives);
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify({
      swarmId, sessionId, manifestPath: manifestLib.manifestPath(ecosystemRoot, swarmId),
      directives, spawned: spawnResults,
    }, null, 2) + '\n');
    return;
  }

  console.log(`▸ Swarm started: ${swarmId}`);
  console.log(`  Initiative: ${opts.initiative}`);
  console.log(`  Mode: ${opts.mode}`);
  console.log(`  Session: ${sessionId}`);
  console.log(`  Waves: ${manifest.waves.length}`);
  for (const w of manifest.waves) {
    console.log(`    Wave ${w.index}: ${w.repos.join(', ')}`);
  }
  console.log('');
  console.log(`▸ Wave 1 spawn directives (${directives.length}):`);
  for (const d of directives) {
    console.log(`  - ${d.repoId}: ${d.repoPath}`);
  }
  if (opts.spawn && spawnResults) {
    console.log('');
    console.log('▸ Spawn results:');
    for (const r of spawnResults) {
      console.log(`  - ${r.repoId}: ${r.status === 0 ? 'ok' : 'failed'}`);
    }
  } else {
    console.log('');
    console.log('  (dry-run — pass --spawn to launch Claude Code supervisors)');
  }
}

function cmdStatus(args) {
  const opts = parseFlags(args, {
    ecosystem: { flag: '--ecosystem', default: null },
    json: { flag: '--json', type: 'bool', default: false },
  });
  const [swarmId] = opts.positional;
  if (!swarmId) throw new Error('swarm status: <swarm-id> required');
  const ecosystemRoot = resolveEcosystemRoot(opts.ecosystem);
  const board = boardLib.loadBoard(ecosystemRoot, swarmId);
  if (!board) throw new Error(`swarm status: no board for ${swarmId}`);
  if (opts.json) {
    process.stdout.write(JSON.stringify(board, null, 2) + '\n');
    return;
  }
  renderBoardTable(board);
}

function cmdTell(args) {
  const opts = parseFlags(args, {
    ecosystem: { flag: '--ecosystem', default: null },
  });
  const [swarmId, repoId, ...rest] = opts.positional;
  const text = rest.join(' ').trim();
  if (!swarmId || !repoId || !text) {
    throw new Error('swarm tell: usage — momentum swarm tell <swarm-id> <repo> "<text>"');
  }
  const ecosystemRoot = resolveEcosystemRoot(opts.ecosystem);
  const manifest = manifestLib.loadManifest(ecosystemRoot, swarmId);
  if (!manifest) throw new Error(`swarm tell: no manifest for ${swarmId}`);
  const repo = manifest.repos[repoId];
  if (!repo) throw new Error(`swarm tell: ${repoId} is not a member of swarm ${swarmId}`);

  const repoPath = conductor.resolveMemberPath(ecosystemRoot, repoId);
  if (!repoPath) throw new Error(`swarm tell: cannot locate repo ${repoId}`);
  const contextPath = path.join(repoPath, 'specs', 'phases', repo.phase_slug, 'swarm-context.md');
  fs.mkdirSync(path.dirname(contextPath), { recursive: true });
  const ts = nowIso();
  const block = `\n\n## tell @ ${ts}\n\n${text}\n`;
  fs.appendFileSync(contextPath, block, 'utf8');

  manifestLib.appendAudit(ecosystemRoot, swarmId, {
    ts, actor: 'conductor', event: 'tell', repo: repoId, detail: text.slice(0, 200),
  });
  boardLib.refreshBoard(ecosystemRoot, swarmId, ts);
  console.log(`▸ tell delivered to ${repoId}: ${path.relative(ecosystemRoot, contextPath)}`);
}

function cmdBroadcast(args) {
  const opts = parseFlags(args, {
    ecosystem: { flag: '--ecosystem', default: null },
  });
  const [swarmId, ...rest] = opts.positional;
  const text = rest.join(' ').trim();
  if (!swarmId || !text) {
    throw new Error('swarm broadcast: usage — momentum swarm broadcast <swarm-id> "<text>"');
  }
  const ecosystemRoot = resolveEcosystemRoot(opts.ecosystem);
  const manifest = manifestLib.loadManifest(ecosystemRoot, swarmId);
  if (!manifest) throw new Error(`swarm broadcast: no manifest for ${swarmId}`);
  const ts = nowIso();
  for (const [repoId, repo] of Object.entries(manifest.repos)) {
    const repoPath = conductor.resolveMemberPath(ecosystemRoot, repoId);
    if (!repoPath) continue;
    const contextPath = path.join(repoPath, 'specs', 'phases', repo.phase_slug, 'swarm-context.md');
    fs.mkdirSync(path.dirname(contextPath), { recursive: true });
    const block = `\n\n## broadcast @ ${ts}\n\n${text}\n`;
    fs.appendFileSync(contextPath, block, 'utf8');
  }
  manifestLib.appendAudit(ecosystemRoot, swarmId, {
    ts, actor: 'conductor', event: 'broadcast', detail: text.slice(0, 200),
  });
  boardLib.refreshBoard(ecosystemRoot, swarmId, ts);
  console.log(`▸ broadcast sent to ${Object.keys(manifest.repos).length} repos`);
}

function cmdVerify(args) {
  const opts = parseFlags(args, {
    ecosystem: { flag: '--ecosystem', default: null },
    json: { flag: '--json', type: 'bool', default: false },
  });
  const [swarmId] = opts.positional;
  if (!swarmId) throw new Error('swarm verify: <swarm-id> required');
  const ecosystemRoot = resolveEcosystemRoot(opts.ecosystem);
  const result = verifySwarm(ecosystemRoot, swarmId);
  if (opts.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  }
  console.log(`▸ Verify ${swarmId}: ${result.ok ? 'OK' : 'FAIL'}`);
  for (const issue of result.issues) {
    console.log(`  ✗ ${issue}`);
  }
  for (const note of result.notes) {
    console.log(`  · ${note}`);
  }
  if (!result.ok) process.exitCode = 1;
}

function cmdComplete(args) {
  const opts = parseFlags(args, {
    ecosystem: { flag: '--ecosystem', default: null },
  });
  const [swarmId] = opts.positional;
  if (!swarmId) throw new Error('swarm complete: <swarm-id> required');
  const ecosystemRoot = resolveEcosystemRoot(opts.ecosystem);
  const ts = nowIso();
  const result = completeSwarm(ecosystemRoot, swarmId, ts);
  console.log(`▸ Swarm ${swarmId} complete`);
  console.log(`  Changeset: ${result.changesetPath}`);
  console.log(`  Repos done: ${result.reposComplete}/${result.reposTotal}`);
}

function cmdResume(args) {
  const opts = parseFlags(args, {
    ecosystem: { flag: '--ecosystem', default: null },
    sessionId: { flag: '--session', default: null },
  });
  const [swarmId] = opts.positional;
  if (!swarmId) throw new Error('swarm resume: <swarm-id> required');
  const ecosystemRoot = resolveEcosystemRoot(opts.ecosystem);
  const sessionId = opts.sessionId || generateSessionId();
  const ts = nowIso();
  const manifest = conductor.resumeSwarm(ecosystemRoot, swarmId, sessionId, ts);
  console.log(`▸ Resumed swarm ${swarmId} as session ${sessionId}`);
  console.log(`  Status: ${manifest.status}`);
  for (const w of manifest.waves) {
    console.log(`    Wave ${w.index}: ${w.status || 'queued'} — ${w.repos.join(', ')}`);
  }
}

function cmdCancel(args) {
  const opts = parseFlags(args, {
    ecosystem: { flag: '--ecosystem', default: null },
    reason: { flag: '--reason', default: 'cancelled by user' },
  });
  const [swarmId] = opts.positional;
  if (!swarmId) throw new Error('swarm cancel: <swarm-id> required');
  const ecosystemRoot = resolveEcosystemRoot(opts.ecosystem);
  const ts = nowIso();
  conductor.cancelSwarm(ecosystemRoot, swarmId, opts.reason, ts);
  console.log(`▸ Swarm ${swarmId} cancelled (${opts.reason})`);
}

function cmdBudget(args) {
  const opts = parseFlags(args, {
    ecosystem: { flag: '--ecosystem', default: null },
  });
  const [swarmId, repoId, deltaStr] = opts.positional;
  if (!swarmId || !repoId || !deltaStr) {
    throw new Error('swarm budget: usage — momentum swarm budget <swarm-id> <repo> +N');
  }
  const sign = deltaStr.startsWith('+') ? 1 : (deltaStr.startsWith('-') ? -1 : 1);
  const delta = sign * parseInt(deltaStr.replace(/^[+-]/, ''), 10);
  if (!Number.isFinite(delta)) throw new Error(`swarm budget: invalid delta ${deltaStr}`);
  const ecosystemRoot = resolveEcosystemRoot(opts.ecosystem);
  const ts = nowIso();
  manifestLib.updateManifest(ecosystemRoot, swarmId, (m) => {
    if (!m.repos[repoId]) throw new Error(`swarm budget: ${repoId} not a member of ${swarmId}`);
    const cur = m.repos[repoId].tokens_budget || conductor.DEFAULT_TOKEN_BUDGET;
    const next = Math.max(1, cur + delta);
    m.repos[repoId].tokens_budget = next;
    if (!Array.isArray(m.audit)) m.audit = [];
    m.audit.push({
      ts, actor: 'conductor', event: 'budget', repo: repoId,
      detail: `${cur} → ${next}`,
    });
  });
  boardLib.refreshBoard(ecosystemRoot, swarmId, ts);
  console.log(`▸ budget(${repoId}) adjusted by ${delta}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Verifier + completion
// ─────────────────────────────────────────────────────────────────────────────

function verifySwarm(ecosystemRoot, swarmId) {
  const issues = [];
  const notes = [];

  const manifest = manifestLib.loadManifest(ecosystemRoot, swarmId);
  if (!manifest) {
    return { ok: false, issues: [`no manifest for ${swarmId}`], notes };
  }
  const mv = manifestLib.validateManifest(manifest);
  if (!mv.ok) {
    for (const e of mv.errors) issues.push(`manifest ${e.path}: ${e.message}`);
  }

  // Initiative back-reference
  const initiativeDir = path.join(ecosystemRoot, 'initiatives');
  const initiativeOk = fs.existsSync(initiativeDir) &&
    fs.readdirSync(initiativeDir).some((n) => n.endsWith(`-${manifest.initiative}.md`));
  if (!initiativeOk) {
    issues.push(`initiative "${manifest.initiative}" not found at ${initiativeDir}`);
  } else {
    notes.push(`initiative ${manifest.initiative} resolved`);
  }

  // Brief back-references
  const ecoMfst = ecosystemLib.loadManifest(ecosystemRoot);
  for (const [repoId, repo] of Object.entries(manifest.repos || {})) {
    const repoPath = conductor.resolveMemberPath(ecosystemRoot, repoId, ecoMfst);
    if (!repoPath) {
      issues.push(`repo "${repoId}" not in ecosystem manifest`);
      continue;
    }
    const briefPath = path.join(repoPath, 'specs', 'phases', repo.phase_slug, 'overview.md');
    if (!fs.existsSync(briefPath)) {
      issues.push(`brief missing: ${briefPath}`);
      continue;
    }
    const { frontmatter } = briefLib.parseSwarmFrontmatter(fs.readFileSync(briefPath, 'utf8'));
    if (!frontmatter || !frontmatter.swarm) {
      issues.push(`brief ${briefPath} has no swarm frontmatter`);
      continue;
    }
    if (frontmatter.swarm !== swarmId) {
      issues.push(`brief ${briefPath} swarm=${frontmatter.swarm} mismatches ${swarmId}`);
    }
    if (frontmatter.wave !== repo.wave) {
      issues.push(`brief ${briefPath} wave=${frontmatter.wave} mismatches manifest wave ${repo.wave}`);
    }
    if (frontmatter.initiative !== manifest.initiative) {
      issues.push(`brief ${briefPath} initiative=${frontmatter.initiative} mismatches ${manifest.initiative}`);
    }
  }

  // Contract shape — every contract artifact must validate against schema basics
  const contractsDir = path.join(manifestLib.swarmDir(ecosystemRoot, swarmId), 'contracts');
  if (fs.existsSync(contractsDir)) {
    for (const file of fs.readdirSync(contractsDir)) {
      if (!file.endsWith('.contract.json')) continue;
      const filePath = path.join(contractsDir, file);
      try {
        const c = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (typeof c.surface !== 'string') issues.push(`${file}: missing surface`);
        if (typeof c.owner !== 'string') issues.push(`${file}: missing owner`);
        if (!Array.isArray(c.consumers)) issues.push(`${file}: consumers must be array`);
        if (!Number.isInteger(c.version) || c.version < 1) issues.push(`${file}: invalid version`);
        if (typeof c.content_hash !== 'string') issues.push(`${file}: missing content_hash`);
      } catch (e) {
        issues.push(`${file}: invalid JSON — ${e.message}`);
      }
    }
  }

  // Inbox — any pending items are advisories, not failures
  const inboxDir = path.join(manifestLib.swarmDir(ecosystemRoot, swarmId), 'inbox');
  if (fs.existsSync(inboxDir)) {
    const pending = fs.readdirSync(inboxDir).filter((n) => /^\d{4}-[a-z][a-z0-9-]*\.md$/.test(n));
    if (pending.length) notes.push(`${pending.length} pending inbox item(s)`);
  }

  return { ok: issues.length === 0, issues, notes };
}

function completeSwarm(ecosystemRoot, swarmId, ts) {
  const manifest = manifestLib.loadManifest(ecosystemRoot, swarmId);
  if (!manifest) throw new Error(`completeSwarm: no manifest for ${swarmId}`);

  const repos = Object.entries(manifest.repos || {});
  const reposComplete = repos.filter(([, r]) => r.status === 'complete').length;
  const reposTotal = repos.length;

  // Write cross-repo changeset to <eco>/changes/<id>.md
  const changesDir = path.join(ecosystemRoot, 'changes');
  fs.mkdirSync(changesDir, { recursive: true });
  const changesetPath = path.join(changesDir, `${swarmId}.md`);
  const lines = [
    `# Swarm ${swarmId} — cross-repo changeset`,
    '',
    `- Initiative: ${manifest.initiative}`,
    `- Mode: ${manifest.mode}`,
    `- Status: ${manifest.status || 'running'}`,
    `- Repos: ${reposComplete}/${reposTotal} complete`,
    `- Completed at: ${ts}`,
    '',
    '## Per-repo contributions',
    '',
  ];
  for (const [repoId, repo] of repos) {
    lines.push(`### ${repoId}`);
    lines.push(`- Wave: ${repo.wave}`);
    lines.push(`- Branch: \`${repo.branch}\``);
    lines.push(`- Phase: \`${repo.phase_slug}\``);
    lines.push(`- Tasks: ${repo.tasks_done || 0}/${repo.tasks_total || 0}`);
    lines.push(`- Commits: ${repo.commits || 0}`);
    lines.push('');
  }
  fs.writeFileSync(changesetPath, lines.join('\n'), 'utf8');

  manifestLib.updateManifest(ecosystemRoot, swarmId, (m) => {
    m.status = reposComplete === reposTotal ? 'complete' : (m.status || 'running');
    if (!Array.isArray(m.audit)) m.audit = [];
    m.audit.push({
      ts, actor: 'conductor', event: 'complete',
      detail: `${reposComplete}/${reposTotal} repos complete`,
    });
  });
  boardLib.refreshBoard(ecosystemRoot, swarmId, ts);

  return { changesetPath, reposComplete, reposTotal };
}

// ─────────────────────────────────────────────────────────────────────────────
// Claude Code spawn wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Launch one Claude Code background session per directive. Uses
 * `claude --bg --cwd <repoPath>`. If the `claude` binary is not
 * available, returns failures (the recipe path is dry-run safe — the
 * Claude Code recipe layer detects missing binaries and degrades).
 */
function spawnClaudeCodeSupervisors(directives) {
  const results = [];
  for (const d of directives) {
    if (d.platform !== 'claude-code') {
      results.push({ repoId: d.repoId, status: -1, detail: `non-claude-code platform: ${d.platform}` });
      continue;
    }
    const claudeBin = process.env.CLAUDE_CODE_BIN || 'claude';
    const args = ['--bg', '--cwd', d.repoPath];
    // Pipe the recipe path + initial brief via stdin
    const prompt = [
      `You are a swarm supervisor. Recipe: ${d.recipePath}`,
      `Read the recipe and the brief at specs/phases/${d.phaseSlug}/overview.md.`,
      `Begin the boot sequence.`,
    ].join('\n');
    const r = spawnSync(claudeBin, args, {
      input: prompt,
      env: Object.assign({}, process.env, d.env),
      encoding: 'utf8',
      timeout: 5000,
    });
    results.push({
      repoId: d.repoId,
      status: r.status == null ? -1 : r.status,
      detail: (r.error && r.error.message) || (r.stderr || '').slice(0, 200),
    });
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────

function renderBoardTable(board) {
  console.log(`▸ Swarm ${board.swarm_id} — mode=${board.mode} status=${board.status} wave=${board.active_wave}`);
  console.log('');
  const header = ['repo', 'wave', 'status', 'tasks', 'tokens', 'commits'];
  const widths = header.map((h) => h.length);
  const rows = [];
  for (const r of board.repos) {
    const row = [
      r.name, String(r.wave), r.status,
      r.tasks || '', r.tokens || '', String(r.commits || 0),
    ];
    rows.push(row);
    for (let i = 0; i < row.length; i++) widths[i] = Math.max(widths[i], row[i].length);
  }
  const fmt = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ');
  console.log('  ' + fmt(header));
  console.log('  ' + widths.map((w) => '-'.repeat(w)).join('  '));
  for (const row of rows) console.log('  ' + fmt(row));
  if (board.recent_activity && board.recent_activity.length) {
    console.log('');
    console.log('  Recent activity:');
    for (const a of board.recent_activity) {
      console.log(`    ${a.ts}  ${a.repo ? a.repo + '  ' : ''}${a.msg}`);
    }
  }
  if (board.inbox_count > 0) {
    console.log('');
    console.log(`  ▸ ${board.inbox_count} pending inbox item(s)`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entrypoint
// ─────────────────────────────────────────────────────────────────────────────

function printUsage() {
  console.log(`momentum swarm — cross-repo work units (Phase 17 v0.20.0, Claude Code only)

Usage:
  momentum swarm start <slug> --initiative <slug> --repos r1,r2,... --phase <phase-slug> [--mode autopilot|checkpoint] [--spawn]
  momentum swarm status <swarm-id> [--json]
  momentum swarm tell <swarm-id> <repo> "<text>"
  momentum swarm broadcast <swarm-id> "<text>"
  momentum swarm verify <swarm-id> [--json]
  momentum swarm complete <swarm-id>
  momentum swarm resume <swarm-id> [--session <id>]
  momentum swarm cancel <swarm-id> [--reason "<text>"]
  momentum swarm budget <swarm-id> <repo> +N | -N

Global flags:
  --ecosystem <path>   Override ecosystem root resolution
`);
}

function runSwarm(args) {
  if (!args || args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    return printUsage();
  }
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case 'start': return cmdStart(rest);
    case 'status': return cmdStatus(rest);
    case 'tell': return cmdTell(rest);
    case 'broadcast': return cmdBroadcast(rest);
    case 'verify': return cmdVerify(rest);
    case 'complete': return cmdComplete(rest);
    case 'resume': return cmdResume(rest);
    case 'cancel': return cmdCancel(rest);
    case 'budget': return cmdBudget(rest);
    default:
      throw new Error(`swarm: unknown subcommand "${sub}". Try --help.`);
  }
}

module.exports = {
  runSwarm,
  // Exposed for tests
  verifySwarm,
  completeSwarm,
  spawnClaudeCodeSupervisors,
  resolveEcosystemRoot,
};
