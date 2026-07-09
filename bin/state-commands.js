'use strict';

/**
 * Phase 10 — top-level state commands: `join`, `leave`, `doctor`.
 *
 * These are user-facing verbs that let a repo move between Standalone,
 * Member, and Leader states without having to know about the
 * `momentum ecosystem` operator toolkit.
 *
 * Internally they compose the existing `momentum ecosystem add/remove`
 * primitives so there is exactly one place that mutates manifests +
 * pointer blocks. State preconditions are checked first to surface
 * clear errors before any mutation.
 */

const fs = require('fs');
const path = require('path');

const stateLib = require('../core/ecosystem/lib/state');
const pointerLib = require('../core/ecosystem/lib/pointer');
const lib = require('../core/ecosystem/lib');

function cmdJoin(args) {
  if (!args || args.length === 0) {
    throw new Error(
      'join: missing <ecosystem-path>. Try `momentum doctor` to see what is reachable from here.',
    );
  }
  let ecosystemPath = path.resolve(process.cwd(), args[0]);
  if (!fs.existsSync(path.join(ecosystemPath, lib.MANIFEST_FILENAME))) {
    throw new Error(
      `join: ${ecosystemPath} has no ecosystem.json. Did you mean a different path?`,
    );
  }
  // Normalize via realpath so the manifest stores a clean relative
  // path (../project) instead of a cross-symlink monstrosity
  // (../../../private/tmp/.../project) on macOS where /tmp → /private/tmp.
  try {
    ecosystemPath = fs.realpathSync(ecosystemPath);
  } catch (_e) { /* keep resolved form */ }

  const cwd = realpathOf(process.cwd());
  lib._clearRootCache();
  const state = stateLib.detectState(cwd);

  if (state === 'leader' || state === 'leader-and-member') {
    throw new Error(
      'join: this directory is itself an ecosystem root. ' +
        'Use `momentum ecosystem add <repo-path>` to register members instead.',
    );
  }

  if (state === 'member') {
    const reg = stateLib.findRegistration(cwd);
    if (reg && path.resolve(reg.rootPath) === ecosystemPath) {
      console.log(
        `Already a member of "${reg.ecosystemName}" at ${reg.rootPath}. No changes.`,
      );
      return;
    }
    throw new Error(
      `join: this repo is already a member of a different ecosystem ` +
        `("${reg ? reg.ecosystemName : '?'}"). Run \`momentum leave\` first.`,
    );
  }

  // standalone / broken-pointer / broken-orphan — proceed with ecosystem add.
  const { runEcosystem } = require('./ecosystem');
  runEcosystem(['add', cwd, '--ecosystem', ecosystemPath]);

  // Re-detect post-mutation to confirm.
  lib._clearRootCache();
  const after = stateLib.detectState(cwd);
  if (after === 'member' || after === 'leader-and-member') {
    const reg = stateLib.findRegistration(cwd);
    console.log('');
    console.log(`✓ Joined "${reg ? reg.ecosystemName : '?'}" as member "${reg ? reg.memberId : '?'}".`);
  }
}

function cmdLeave(args) {
  // No required args; opt-in flags TBD.
  void args;
  const cwd = realpathOf(process.cwd());
  lib._clearRootCache();
  const state = stateLib.detectState(cwd);

  if (state === 'standalone') {
    console.log('Already standalone. No changes.');
    return;
  }
  if (state === 'leader') {
    throw new Error(
      'leave: this directory is an ecosystem root with no membership in another ecosystem. ' +
        'There is nothing to leave.',
    );
  }
  if (state === 'broken-manifest') {
    throw new Error(
      'leave: ecosystem.json in this directory fails validation. ' +
        'Repair or delete it manually before running leave.',
    );
  }

  if (state === 'broken-pointer') {
    // Pointer present but no registration. Strip from every instruction file.
    const stripped = pointerLib.stripPointerAll(cwd);
    if (stripped.length) {
      console.log('Stripped dangling pointer. Now standalone.');
    } else {
      console.log('No pointer block found. No changes.');
    }
    return;
  }

  // member / leader-and-member / broken-orphan — find registration and remove.
  const reg = stateLib.findRegistration(cwd);
  if (!reg) {
    throw new Error(
      'leave: could not locate this repo in any reachable ecosystem manifest. ' +
        'Try `momentum doctor` for diagnostics.',
    );
  }

  const { runEcosystem } = require('./ecosystem');
  runEcosystem(['remove', reg.memberId, '--ecosystem', reg.rootPath]);
  console.log('');
  console.log(`✓ Left "${reg.ecosystemName}". Now standalone.`);
}

// ── Phase 27 G4 — stray-artifact sweep (`momentum doctor --clean`) ──────────

const BAK_ROOTS = ['.claude', '.agents', '.opencode', '.codex', '.githooks', 'scripts'];

/** Bounded walk collecting AppleDouble sidecars anywhere (always junk). */
function walkAppleDouble(dir, acc, depth) {
  if (depth > 8) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const abs = path.join(dir, e.name);
    if (e.name.startsWith('._') || e.name === '.DS_Store') { acc.appleDouble.push(abs); continue; }
    if (e.isDirectory()) walkAppleDouble(abs, acc, depth + 1);
  }
}

/** `.bak` files under a momentum-managed root only (never user backups). */
function collectBaks(dir, acc, depth) {
  if (depth > 8) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) collectBaks(abs, acc, depth + 1);
    else if (e.name.endsWith('.bak')) acc.baks.push(abs);
  }
}

/** Find stray artifacts: AppleDouble, momentum `.bak` litter, orphan worktrees. */
function findStrayArtifacts(root) {
  const { spawnSync } = require('child_process');
  const acc = { appleDouble: [], baks: [], prunableWorktrees: [], orphanWorktreeDirs: [] };
  walkAppleDouble(root, acc, 0);
  for (const sub of BAK_ROOTS) collectBaks(path.join(root, sub), acc, 0);
  for (const f of ['CLAUDE.md.bak', 'AGENTS.md.bak']) {
    const p = path.join(root, f);
    if (fs.existsSync(p)) acc.baks.push(p);
  }
  // registered worktrees whose directory is gone → prunable
  const registered = new Set();
  const wl = spawnSync('git', ['worktree', 'list', '--porcelain'], { cwd: root, encoding: 'utf8' });
  if (wl.status === 0) {
    for (const line of wl.stdout.split('\n')) {
      if (line.startsWith('worktree ')) {
        const p = line.slice('worktree '.length);
        registered.add(realpathOf(p));
        if (p !== root && !fs.existsSync(p)) acc.prunableWorktrees.push(p);
      }
    }
  }
  // .claude/worktrees/* leftover dirs not registered as git worktrees
  const cw = path.join(root, '.claude', 'worktrees');
  try {
    for (const name of fs.readdirSync(cw)) {
      const abs = path.join(cw, name);
      if (fs.statSync(abs).isDirectory() && !registered.has(realpathOf(abs))) acc.orphanWorktreeDirs.push(abs);
    }
  } catch { /* no .claude/worktrees */ }
  return acc;
}

function sweepStrayArtifacts(root, execute) {
  const { spawnSync } = require('child_process');
  const stray = findStrayArtifacts(root);
  const total = stray.appleDouble.length + stray.baks.length
    + stray.prunableWorktrees.length + stray.orphanWorktreeDirs.length;
  const rel = (p) => path.relative(root, p) || p;

  console.log(execute ? 'Cleaning stray artifacts:' : 'Stray artifacts (dry-run — pass --execute to remove):');
  if (total === 0) { console.log('  ✓ none — tree is clean'); return 0; }

  for (const p of stray.appleDouble) {
    if (execute) { try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* ignore */ } }
    console.log(`  ${execute ? '✓ removed' : '·'} AppleDouble: ${rel(p)}`);
  }
  for (const p of stray.baks) {
    if (execute) { try { fs.rmSync(p, { force: true }); } catch { /* ignore */ } }
    console.log(`  ${execute ? '✓ removed' : '·'} .bak: ${rel(p)}`);
  }
  for (const p of stray.orphanWorktreeDirs) {
    if (execute) { try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* ignore */ } }
    console.log(`  ${execute ? '✓ removed' : '·'} orphan worktree dir: ${rel(p)}`);
  }
  if (stray.prunableWorktrees.length) {
    if (execute) spawnSync('git', ['worktree', 'prune'], { cwd: root });
    for (const p of stray.prunableWorktrees) console.log(`  ${execute ? '✓ pruned' : '·'} stale worktree ref: ${rel(p)}`);
  }
  console.log(execute ? `✓ cleaned ${total} stray artifact(s)` : `${total} stray artifact(s) — rerun with --execute to remove`);
  return 0;
}

function cmdDoctor(args) {
  // Phase 27 G4 — `momentum doctor --clean [--execute]` sweeps stray artifacts.
  if (args && args.includes('--clean')) {
    return sweepStrayArtifacts(realpathOf(process.cwd()), args.includes('--execute'));
  }
  const cwd = realpathOf(process.cwd());
  lib._clearRootCache();
  const state = stateLib.detectState(cwd);
  const reg = stateLib.findRegistration(cwd);

  console.log(`Path:  ${cwd}`);
  console.log(`State: ${formatStateLabel(state)}`);
  if (reg) {
    console.log(`Ecosystem: ${reg.ecosystemName}`);
    console.log(`  root:    ${reg.rootPath}`);
    console.log(`  member:  ${reg.memberId}  (role: ${reg.memberRole || 'other'})`);
  } else if (state === 'leader' || state === 'leader-and-member') {
    try {
      const manifest = lib.loadManifest(cwd);
      console.log(`Ecosystem: ${manifest.name}`);
      console.log(`  members: ${manifest.members.length}`);
    } catch (_err) { /* shown via state */ }
  }
  console.log('');

  // Phase 22b G3 — Antigravity runtime advisory. Only for projects whose
  // momentum install targets antigravity (lock file), and only ADVISES the
  // official installer — momentum never provisions vendor binaries (see the
  // VAL-002 adjudication record).
  try {
    const lockPath = path.join(cwd, '.momentum', 'installed.json');
    if (fs.existsSync(lockPath)) {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      if (lock.agent === 'antigravity' || (lock.agents && lock.agents['antigravity'])) {
        const { spawnSync } = require('child_process');
        const agyBin = process.env.AGY_BIN || 'agy';
        const found = agyBin.includes(path.sep)
          ? fs.existsSync(agyBin)
          : spawnSync('which', [agyBin], { stdio: 'ignore' }).status === 0;
        if (!found) {
          console.log('Advisory: this project targets Antigravity but the `agy` CLI is not on PATH.');
          console.log('  Headless features (swarm spawn, orchestration CLI floor) need it.');
          console.log('  Official installer: curl -fsSL https://antigravity.google/cli/install.sh | bash');
          console.log('  (The Antigravity IDE works without it — this only affects CLI/headless use.)');
          console.log('');
        }
      }
    }
  } catch (_err) { /* advisory is best-effort — never block doctor */ }

  // Phase 27 G4 — stray-artifact advisory (best-effort, non-blocking).
  try {
    const stray = findStrayArtifacts(cwd);
    const n = stray.appleDouble.length + stray.baks.length
      + stray.prunableWorktrees.length + stray.orphanWorktreeDirs.length;
    if (n > 0) {
      console.log(`Advisory: ${n} stray artifact(s) (AppleDouble / .bak / orphan worktrees) — run \`momentum doctor --clean\` to review, \`--clean --execute\` to remove.`);
      console.log('');
    }
  } catch { /* best-effort */ }

  const transitions = stateLib.availableTransitions(state, reg || {});
  if (transitions.length === 0) {
    console.log('No suggested next steps for this state.');
    return;
  }
  console.log('What you can do next:');
  for (const t of transitions) {
    console.log('');
    console.log(`  ${t.command}`);
    console.log(`    ${t.description}`);
  }
}

function realpathOf(p) {
  try {
    return fs.realpathSync(p);
  } catch (_e) {
    return path.resolve(p);
  }
}

function formatStateLabel(state) {
  const labels = {
    standalone: 'Standalone — momentum-installed, not in any ecosystem',
    member: 'Member — part of an ecosystem',
    leader: 'Leader — this directory IS an ecosystem root',
    'leader-and-member': 'Leader+Member — ecosystem root that is also a member of another ecosystem',
    'broken-manifest': 'Broken (manifest) — ecosystem.json fails validation',
    'broken-pointer': 'Broken (pointer) — pointer block present but no matching ecosystem',
    'broken-orphan': 'Broken (orphan) — registered in an ecosystem but pointer block missing',
  };
  return labels[state] || state;
}

module.exports = {
  cmdJoin,
  cmdLeave,
  cmdDoctor,
  formatStateLabel,
  findStrayArtifacts,
  sweepStrayArtifacts,
};
