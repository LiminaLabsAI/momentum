'use strict';

// Antigravity adapter for momentum.
//
// Antigravity (2.x: IDE + `agy` CLI + Python SDK over one shared agent
// harness) auto-loads AGENTS.md hierarchically as its primary instruction
// surface and discovers workflows/skills/hooks/plugins under the `.agents/`
// customization root. Contract locked by live probes against agy 1.0.16 —
// see specs/phases/phase-22b-antigravity-2-adoption/evidence/fact-sheet.md
// and ADR-0005.

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

module.exports = {
  displayName: 'Antigravity',

  destinations: {
    // Phase 22b (ADR-0005): ONE canonical customization root — .agents/.
    // agy 1.0.16 accepts .agents/.agent/_agents/_agent equally (fact-sheet §1);
    // .agents/ is what every vendor example, the builtin reference docs, and
    // the plugin layout use. Legacy .agent/ files are orphan-cleaned on
    // upgrade (Phase 20 machinery; user-owned files keep their shield).
    // Recipes are workflows (auto-register as /<name> slash commands).
    // agents/ declared but unused — personas live as skills on Antigravity.
    commands: ['.agents', 'workflows'], // legacy commands key reused — overlay still feeds via destinations[commands]
    'agent-rules': ['.agents', 'rules'],
    scripts: ['scripts'],
    engines: ['.agents', 'engines'],
    workflows: ['.agents', 'workflows'],
    skills: ['.agents', 'skills'],
    agents: ['.agents', 'agents'],
  },

  primaryInstruction: {
    source: ['instructions', 'AGENTS.md'],
    destination: ['AGENTS.md'],
    label: 'AGENTS.md',
    markerAware: true,
  },

  configFiles: [
    {
      source: ['hooks.json'],
      destination: ['.agents', 'hooks.json'],
      label: '.agents/hooks.json',
    },
  ],

  capabilities: {
    hooks: true,          // Phase 22b: five-event contract verified live (fact-sheet §5; PreToolUse/PostToolUse/PreInvocation/PostInvocation/Stop all fired)
    slashCommands: true,  // Phase 22b: workflows auto-register as /<name> — verified live incl. planted markers (fact-sheet §3)
    subagents: true,
    parallelSubagents: true,
    sessionStartHook: false, // Phase 22b: no SessionStart event EXISTS (5-event surface). Equivalent ships via PreInvocation invocationNum==0 + injectSteps; flip gated on the live injection round-trip (ENH-052 hang blocks re-probe).
    skills: true,         // Phase 22b: <name>/SKILL.md discovery verified live (fact-sheet §4)
    browser: false,
    computerUse: false,
    artifacts: true,
    planningMode: true,
  },

  roadmap: {
    sessionStartHook:
      'Phase 22b (ADR-0005): SessionStart does not exist on Antigravity — the momentum-session-context PreInvocation hook injects the handoff banner + queued notices as ephemeralMessage at invocationNum 0. Capability flips true once the injection round-trip is verified live (re-probe blocked by the intermittent agy 1.0.16 hook-runner hang, ENH-052). AGENTS.md text carries the fallback handoff hint meanwhile.',
  },

  runInstall(targetDir, adapterDir, helpers) {
    const { copyFile, fileExists, recordManaged } = helpers;

    console.log('→ Configuring Antigravity hooks...');
    const hooksDest = path.join(targetDir, '.agents', 'hooks.json');
    if (recordManaged) recordManaged(hooksDest); // managed regardless of write
    if (!fileExists(hooksDest)) {
      copyFile(path.join(adapterDir, 'hooks.json'), hooksDest);
    } else {
      console.log('  ⚠️  .agents/hooks.json already exists.');
      console.log(`     Merge hooks manually from: ${path.join(adapterDir, 'hooks.json')}`);
    }
  },

  runUpgrade(targetDir, adapterDir, helpers) {
    const { copyFile, fileExists, recordManaged, dryRun } = helpers;

    console.log('→ Upgrading Antigravity hooks...');
    const src = path.join(adapterDir, 'hooks.json');
    const dest = path.join(targetDir, '.agents', 'hooks.json');
    if (recordManaged) recordManaged(dest); // managed even when identical-skip

    if (fileExists(dest)) {
      const srcContent = fs.readFileSync(src, 'utf8');
      const destContent = fs.readFileSync(dest, 'utf8');
      if (srcContent !== destContent) {
        if (dryRun) {
          console.log('  ✋ would upgrade: .agents/hooks.json');
        } else {
          fs.copyFileSync(dest, dest + '.bak');
          copyFile(src, dest);
          console.log('  ↑ upgraded: .agents/hooks.json (original saved as .bak)');
        }
      }
    } else {
      copyFile(src, dest);
      console.log('  + added:    .agents/hooks.json');
    }
  },

  // Phase 22b G2 — adapter.spawn(directive) on the REAL agy CLI surface.
  //
  // agy 1.0.16 has no --cwd/--skill flags (fact-sheet §7 — the Phase 18
  // contract was written against a runtime that did not exist). Real shape:
  //   - run FROM directive.repoPath (process cwd),
  //   - headless print mode: -p <prompt>,
  //   - --new-project: MANDATORY isolation — without it print mode can
  //     resume an unrelated prior conversation for the workspace,
  //   - skill engagement by name in the prompt (semantic activation),
  //   - --dangerously-skip-permissions: supervisors edit files headlessly,
  //   - --print-timeout as the in-CLI bound + detached launch with logs:
  //     print runs take minutes and can hang PAST their own timeout when
  //     hooks are present (ENH-052) — the conductor monitors via the board
  //     and the per-repo log file; never block the conductor's session.
  spawn(directive) {
    if (!directive || directive.platform !== 'antigravity') {
      return {
        repoId: directive && directive.repoId,
        status: -1,
        detail: `non-antigravity platform: ${directive && directive.platform}`,
      };
    }
    const agyBin = process.env.AGY_BIN || 'agy';

    // Synchronous missing-binary detection (the async 'error' event would
    // arrive after we return the contract tuple).
    const resolved = agyBin.includes(path.sep)
      ? (fs.existsSync(agyBin) ? agyBin : null)
      : (() => {
          const w = spawnSync('which', [agyBin], { encoding: 'utf8' });
          return w.status === 0 ? agyBin : null;
        })();
    if (!resolved) {
      return {
        repoId: directive.repoId,
        status: -1,
        detail: `agy not found (${agyBin}) — install: curl -fsSL https://antigravity.google/cli/install.sh | bash`,
      };
    }

    const printTimeout = process.env.MOMENTUM_AGY_PRINT_TIMEOUT || '30m';
    const prompt = [
      `Load the swarm-supervisor skill and stay in that persona.`,
      `You are a swarm supervisor. Recipe: ${directive.recipePath}`,
      `Read the recipe and the brief at specs/phases/${directive.phaseSlug}/overview.md.`,
      `Your repo: ${directive.repoId}. Your swarm: ${directive.swarmId} wave ${directive.wave}.`,
      `Begin the boot sequence.`,
    ].join('\n');
    const args = [
      '--new-project',
      '--dangerously-skip-permissions',
      '--print-timeout', printTimeout,
      '-p', prompt,
    ];

    let logPath = null;
    let out = 'ignore';
    try {
      const logDir = path.join(directive.repoPath, '.momentum');
      fs.mkdirSync(logDir, { recursive: true });
      logPath = path.join(logDir, `swarm-supervisor-${directive.swarmId}-w${directive.wave}.log`);
      out = fs.openSync(logPath, 'a');
    } catch (_) { /* log file is best-effort — spawn proceeds without it */ }

    try {
      const child = spawn(resolved, args, {
        cwd: directive.repoPath,
        env: Object.assign({}, process.env, directive.env),
        detached: true,
        stdio: ['ignore', out, out],
      });
      child.unref();
      if (typeof out === 'number') fs.closeSync(out);
      return {
        repoId: directive.repoId,
        status: 0,
        detail: `launched pid ${child.pid}${logPath ? ` (log: ${logPath})` : ''}`,
      };
    } catch (err) {
      if (typeof out === 'number') { try { fs.closeSync(out); } catch (_) {} }
      return {
        repoId: directive.repoId,
        status: -1,
        detail: (err && err.message) || 'spawn failed',
      };
    }
  },
};
