'use strict';

// CLI verbs for orchestration primitives.
//
// Three doors, one library. This is the CLI door — `momentum scout`,
// `momentum dispatch`, `momentum handoff`, `momentum continue`. All
// dispatch into core/orchestration/* so output shape is identical to
// the slash-command and natural-language inference doors.

const fs = require('node:fs');
const path = require('node:path');

const MOMENTUM_ROOT = path.resolve(__dirname, '..');
const orchestration = require(path.join(MOMENTUM_ROOT, 'core', 'orchestration'));
const { findRegistration } = require(path.join(MOMENTUM_ROOT, 'core', 'ecosystem', 'lib', 'state'));

// ── shared helpers ─────────────────────────────────────────────────────────

function resolveEcosystemFromCwd(repoPath) {
  try {
    const reg = findRegistration(repoPath);
    if (reg && reg.rootPath) {
      return { rootPath: reg.rootPath, memberId: reg.memberId };
    }
  } catch {
    // ignore
  }
  return null;
}

function resolveTargetRepo(spec, ecosystem) {
  // Allow either a manifest member id or a relative/absolute path.
  if (!spec) return null;
  if (path.isAbsolute(spec) && fs.existsSync(spec)) return spec;

  if (ecosystem && ecosystem.rootPath) {
    const lib = require(path.join(MOMENTUM_ROOT, 'core', 'ecosystem', 'lib', 'index'));
    try {
      const manifest = lib.loadManifest(ecosystem.rootPath);
      for (const m of lib.listMembers(manifest)) {
        if (m.id === spec) {
          return path.resolve(ecosystem.rootPath, m.path);
        }
      }
    } catch {
      // fall through to path resolution
    }
  }

  const asRel = path.resolve(process.cwd(), spec);
  if (fs.existsSync(asRel)) return asRel;
  return null;
}

function printOrchHelp(verb) {
  const blocks = {
    scout: [
      'Usage: momentum scout <repo> "<prompt>"',
      '',
      'Read-only context fetch from one ecosystem member repo.',
      '',
      'Doors:',
      '  - slash:    /scout <repo> "<prompt>"        (Claude Code, Codex)',
      '  - natural:  describe a single-repo read-only task in prose',
      '  - cli:      momentum scout <repo> "<prompt>"  (universal floor)',
      '',
      'Tracking contract: session log + scout-NNN.md auto every time;',
      '[DISCOVERY] in scouted repo only if finding meets Rule 3 criteria.',
    ],
    dispatch: [
      'Usage: momentum dispatch <repo1> [repo2 ...] --prompt "<text>"',
      '',
      'Parallel multi-repo fan-out + synthesis.',
      '',
      'Flags:',
      '  --prompt "<text>"   high-level intent (tailored per-repo at runtime)',
      '  --sequential        force sequential mode (testing aid)',
      '',
      'Doors: /dispatch (slash) | natural-language inference | momentum dispatch (CLI)',
      '',
      'Tracking contract: session log + dispatch-NNN.md auto every time;',
      'per-repo [DISCOVERY] only for meaningful findings.',
    ],
    handoff: [
      'Usage: momentum handoff <repo> [--summary "<text>"]',
      '',
      'Write a context block to <repo>/.momentum/inbox/handoff-NNN.md so',
      'a new agent session in that repo can pick up where you left off.',
      '',
      'Tracking contract: writes the inbox file AND emits a [DECISION] in',
      'the originating repo\'s active phase history (handoff IS a decision).',
    ],
    continue: [
      'Usage: momentum continue [--handoff <id>]',
      '',
      'Pick up a pending handoff in the current repo. With no --handoff,',
      'lists pending handoffs and picks the oldest unread.',
    ],
  };
  for (const line of blocks[verb] || []) console.log(line);
}

function parseFlags(args, knownFlags) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (knownFlags.includes(a)) {
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[a.slice(2)] = next;
        i++;
      } else {
        flags[a.slice(2)] = true;
      }
    } else if (a === '--help' || a === '-h') {
      flags.help = true;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

// ── cmdScout ───────────────────────────────────────────────────────────────

async function cmdScout(args) {
  const { positional, flags } = parseFlags(args, []);
  if (flags.help || positional.length < 2) {
    printOrchHelp('scout');
    process.exit(flags.help ? 0 : positional.length === 0 ? 1 : 1);
  }
  const repoSpec = positional[0];
  const prompt = positional.slice(1).join(' ');
  const originatingRepo = process.cwd();
  const ecosystem = resolveEcosystemFromCwd(originatingRepo);
  const targetRepo = resolveTargetRepo(repoSpec, ecosystem);

  if (!targetRepo) {
    console.error(`Error: could not resolve <repo> "${repoSpec}" — not a member id and not an existing path.`);
    process.exit(1);
  }

  const result = await orchestration.scout.scout({
    repo: targetRepo,
    prompt,
    originatingRepo,
    ecosystem: ecosystem || undefined,
  });

  // Renderer already printed lifecycle lines; final summary goes to stdout.
  process.stdout.write('\n');
  process.stdout.write(result.summary + '\n');
}

// ── cmdDispatch ────────────────────────────────────────────────────────────

async function cmdDispatch(args) {
  const { positional, flags } = parseFlags(args, ['--prompt']);
  if (flags.help || positional.length === 0 || !flags.prompt) {
    printOrchHelp('dispatch');
    process.exit(flags.help ? 0 : 1);
  }
  const originatingRepo = process.cwd();
  const ecosystem = resolveEcosystemFromCwd(originatingRepo);
  const repos = positional
    .map((spec) => ({ spec, abs: resolveTargetRepo(spec, ecosystem) }))
    .filter((entry) => {
      if (!entry.abs) {
        console.error(`Warning: skipping unresolved repo "${entry.spec}"`);
        return false;
      }
      return true;
    })
    .map((entry) => entry.abs);

  if (repos.length === 0) {
    console.error('Error: no resolvable repos in dispatch list.');
    process.exit(1);
  }

  const dispatch = orchestration.dispatch;
  const result = await dispatch.dispatch({
    repos,
    userIntent: flags.prompt,
    originatingRepo,
    ecosystem: ecosystem || undefined,
    forceSequential: Boolean(flags.sequential),
  });

  process.stdout.write('\n');
  process.stdout.write(result.synthesis + '\n');
  if (result.failures.length) {
    process.stdout.write(`\n${result.failures.length} repo(s) failed:\n`);
    for (const f of result.failures) {
      process.stdout.write(`  - ${f.repo}: ${f.error && f.error.message ? f.error.message : f.error}\n`);
    }
  }
}

// ── cmdHandoff ─────────────────────────────────────────────────────────────

async function cmdHandoff(args) {
  const { positional, flags } = parseFlags(args, ['--summary', '--decision', '--file', '--verify', '--question']);
  if (flags.help || positional.length === 0) {
    printOrchHelp('handoff');
    process.exit(flags.help ? 0 : 1);
  }
  const originatingRepo = process.cwd();
  const ecosystem = resolveEcosystemFromCwd(originatingRepo);
  const targetRepo = resolveTargetRepo(positional[0], ecosystem);

  if (!targetRepo) {
    console.error(`Error: could not resolve <repo> "${positional[0]}".`);
    process.exit(1);
  }

  const summary = flags.summary || `Continue work from ${path.basename(originatingRepo)}.`;
  const block = await orchestration.handoff.handoff({
    fromRepo: originatingRepo,
    toRepo: targetRepo,
    summary,
    decisions: arrayify(flags.decision),
    filesTouched: arrayify(flags.file),
    verificationCommands: arrayify(flags.verify),
    openQuestions: arrayify(flags.question),
    ecosystem: ecosystem || undefined,
  });

  process.stdout.write(`\n▸ handoff written: ${block.inboxPath}\n`);
}

// ── cmdContinue ────────────────────────────────────────────────────────────

async function cmdContinue(args) {
  const { positional, flags } = parseFlags(args, ['--handoff']);
  if (flags.help) {
    printOrchHelp('continue');
    process.exit(0);
  }
  const originatingRepo = process.cwd();
  const ecosystem = resolveEcosystemFromCwd(originatingRepo);
  const block = await orchestration.continueHandoff.continueHandoff({
    repo: originatingRepo,
    handoffId: flags.handoff || (positional.length ? positional[0] : undefined),
    ecosystem: ecosystem || undefined,
  });

  if (!block) {
    process.stdout.write('▸ no pending handoffs in this repo\n');
    return;
  }
  process.stdout.write(`\n▸ picking up handoff-${block.handoffId} from ${path.basename(block.fromRepo)}\n\n`);
  process.stdout.write(`Summary: ${block.summary}\n`);
  if (block.decisions.length) {
    process.stdout.write('\nDecisions:\n');
    for (const d of block.decisions) process.stdout.write(`  - ${d}\n`);
  }
  if (block.filesTouched.length) {
    process.stdout.write('\nFiles touched:\n');
    for (const f of block.filesTouched) process.stdout.write(`  - ${f}\n`);
  }
  if (block.verificationCommands.length) {
    process.stdout.write('\nVerification:\n');
    for (const v of block.verificationCommands) process.stdout.write(`  $ ${v}\n`);
  }
  if (block.openQuestions.length) {
    process.stdout.write('\nOpen questions:\n');
    for (const q of block.openQuestions) process.stdout.write(`  ? ${q}\n`);
  }
}

function arrayify(v) {
  if (v == null || v === false) return [];
  if (Array.isArray(v)) return v;
  return [String(v)];
}

module.exports = {
  cmdScout,
  cmdDispatch,
  cmdHandoff,
  cmdContinue,
  // exported for tests:
  resolveTargetRepo,
  resolveEcosystemFromCwd,
};
