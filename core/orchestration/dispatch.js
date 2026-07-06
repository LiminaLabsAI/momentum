'use strict';

// dispatch — parallel multi-repo fan-out + synthesis.
//
// In-process mode (CLI floor): runs scout against each repo. On
// `mode='parallel'` they run concurrently via Promise.all; on
// `mode='sequential'` they run one at a time and the user is told
// up front via a `started` event note. Either way, sub-agent failures
// are captured in `failures[]` — the call never throws.
//
// In-agent mode (slash command on Claude Code / Codex / Antigravity):
// the agent does the per-repo fan-out using its own sub-agent surface
// (Task tool on Claude Code, etc.), then calls record() with the
// structured results so the artifact + log line + tracking-contract
// hand-off all happen via the same code path as the CLI.
//
// Synthesis: in-process, the synthesizer concatenates per-repo
// summaries with a header — no LLM available from raw Node. Agent-
// driven dispatch produces a true synthesis in the originating agent's
// context, then calls record() with `synthesis` text included.

const path = require('node:path');

const eventsLib = require('./events');
const runArtifact = require('./run-artifact');
const sessionLog = require('./session-log');
const types = require('./types');
const routing = require('./capability-routing');
const scoutLib = require('./scout');

// ENH-034 — CLI / in-process dispatch degraded-mode notice. Emitted as
// the FIRST event before `started`, and rendered as a `> [!NOTE]`
// admonition inside the artifact + synthesis body. Three surfaces, one
// string so the message stays consistent everywhere agents/users see it.
const CLI_MODE_NOTICE =
  'MODE NOTICE: CLI mode produces keyword summaries only (no LLM synthesis). ' +
  'For full synthesis, invoke /dispatch as a slash command from an agent surface ' +
  '(Claude Code Task tool, Codex sub-agent, etc.).';

/**
 * Run a dispatch in-process across the given repos.
 *
 * @param {object} opts
 * @param {string[]} opts.repos              absolute paths to target repos
 * @param {string}   opts.userIntent         high-level prompt
 * @param {string}   [opts.originatingRepo]  defaults to first repo
 * @param {object}   [opts.adapter]          adapter module for capability routing
 * @param {object}   [opts.ecosystem]        { rootPath, memberId }
 * @param {boolean}  [opts.forceSequential]  force sequential mode (testing aid)
 * @param {boolean}  [opts.silent]
 * @returns {Promise<DispatchResult>}
 */
async function dispatch(opts) {
  const { repos, userIntent } = opts;
  if (!Array.isArray(repos) || repos.length === 0) {
    throw new Error('orchestration/dispatch: opts.repos must be a non-empty array');
  }
  if (!userIntent) {
    throw new Error('orchestration/dispatch: opts.userIntent is required');
  }
  const originatingRepo = opts.originatingRepo || repos[0];

  // Decide mode: explicit override > adapter capability > parallel default.
  let mode = 'parallel';
  let modeNotes = [];
  if (opts.forceSequential) {
    mode = 'sequential';
    modeNotes.push('sequential mode forced via --sequential');
  } else if (opts.adapter) {
    const decision = routing.chooseMode(opts.adapter, 'dispatch');
    mode = decision.mode;
    modeNotes = decision.notes;
  }

  const start = Date.now();
  const emitter = opts.emitter || eventsLib.createEmitter({ primitive: 'dispatch', repo: originatingRepo });
  if (!opts.emitter && !opts.silent) {
    emitter.on(eventsLib.createRenderer({ stream: process.stdout }));
  }
  if (opts.ecosystem) {
    emitter.on(eventsLib.createPersister({
      ecosystemRoot: opts.ecosystem.rootPath,
      memberId: opts.ecosystem.memberId,
    }));
  }

  // ENH-034 — surface the in-process degraded-mode notice UPFRONT
  // (before the `started` event) so it is the literal first user-visible
  // output line. Without this, agents and users were silently getting
  // keyword-grep summaries and concluding "this is the answer."
  //
  // The `record()` path (agent-driven dispatch from a slash command)
  // never reaches dispatch(), so this notice only fires for CLI /
  // in-process callers — exactly where it's needed.
  emitter.emit('note', { message: CLI_MODE_NOTICE });

  emitter.emit('started', {
    message: `${repos.length} repo(s): ${userIntent}`,
  });
  for (const note of modeNotes) {
    emitter.emit('note', { message: note });
  }

  const perRepoResults = [];
  const failures = [];

  async function runOne(repo) {
    emitter.emit('subagent-started', { repo });
    const perRepoPrompt = tailorPrompt(userIntent, repo);
    const t0 = Date.now();
    try {
      const scoutResult = await scoutLib.scout({
        repo,
        prompt: perRepoPrompt,
        originatingRepo,
        // Skip session log on sub-scouts so the ecosystem log isn't
        // peppered with per-repo lines; the dispatch parent emits one
        // line summarising the whole run.
        ecosystem: null,
        silent: true,
      });
      const entry = {
        repo,
        prompt: perRepoPrompt,
        summary: scoutResult.summary,
        findings: scoutResult.findings,
        filesRead: scoutResult.filesRead,
        duration: Date.now() - t0,
      };
      perRepoResults.push(entry);
      emitter.emit('subagent-finished', { repo, duration: entry.duration });
      return entry;
    } catch (err) {
      const entry = {
        repo,
        prompt: perRepoPrompt,
        error: { message: err.message },
        duration: Date.now() - t0,
      };
      perRepoResults.push(entry);
      failures.push(entry);
      emitter.emit('subagent-failed', { repo, error: err.message });
      return entry;
    }
  }

  if (mode === 'parallel') {
    await Promise.all(repos.map(runOne));
  } else {
    for (const repo of repos) {
      await runOne(repo);
    }
  }

  const synthesis = synthesizeInProcess({ userIntent, perRepoResults, failures });
  emitter.emit('synthesized', { summary: oneLineSynthesis(perRepoResults, failures) });

  const duration = Date.now() - start;
  const { runId, artifactPath } = runArtifact.writeWithAllocatedId({
    repo: originatingRepo,
    primitive: 'dispatch',
    bodyFor: (id) => renderArtifact({ runId: id, repos, userIntent, mode, modeNotes, perRepoResults, failures, synthesis, duration }),
  });
  emitter.context.runId = runId;
  emitter.emit('finished', { duration, runArtifactPath: artifactPath });

  const result = {
    repos,
    userIntent,
    mode,
    modeNotes,
    perRepoResults,
    failures,
    synthesis,
    duration,
    runArtifactPath: artifactPath,
    runId,
  };
  return types.validateDispatchResult(result);
}

/**
 * Record a dispatch performed by an external agent.
 *
 * The agent does its own sub-agent fan-out (e.g., Claude Code Task
 * tool) and synthesis, then calls record() with the structured shape
 * so the artifact + session log line + tracking-contract hand-off all
 * happen via the same code path the CLI uses.
 */
function record(opts) {
  const {
    repos,
    userIntent,
    mode = 'parallel',
    modeNotes = [],
    perRepoResults = [],
    failures = [],
    synthesis,
    originatingRepo,
    ecosystem,
    duration = 0,
  } = opts;
  if (!originatingRepo) {
    throw new Error('orchestration/dispatch.record: originatingRepo required');
  }
  const { runId, artifactPath } = runArtifact.writeWithAllocatedId({
    repo: originatingRepo,
    primitive: 'dispatch',
    bodyFor: (id) => renderArtifact({ runId: id, repos, userIntent, mode, modeNotes, perRepoResults, failures, synthesis, duration, isAgentDriven: true }),
  });
  if (ecosystem && ecosystem.rootPath && ecosystem.memberId) {
    sessionLog.appendLine({
      ecosystemRoot: ecosystem.rootPath,
      memberId: ecosystem.memberId,
      kind: 'dispatch',
      summary: `${repos.length} repos: ${userIntent}`,
      context: `run-${runId} → ${path.relative(originatingRepo, artifactPath)}`,
    });
  }
  // Tracking contract: each per-repo finding proposed as [DISCOVERY]
  // in THAT repo's active phase history (only when meaningful per
  // Rule 3). The synthesis is proposed as a [NOTE] in the
  // ORIGINATING repo's active phase history when present.
  const tracking = require('./tracking');
  for (const perRepo of perRepoResults) {
    if (!perRepo.findings) continue;
    for (const finding of perRepo.findings) {
      tracking.proposeDiscovery({ primitive: 'dispatch', finding, targetRepo: perRepo.repo });
    }
  }
  if (synthesis) {
    tracking.proposeHistoryNote({
      primitive: 'dispatch',
      originatingRepo,
      message: `dispatch across ${repos.length} repo(s) for: ${userIntent}`,
      runArtifactRef: path.relative(originatingRepo, artifactPath),
    });
  }
  const result = {
    repos, userIntent, mode, modeNotes,
    perRepoResults, failures, synthesis,
    duration, runArtifactPath: artifactPath, runId,
  };
  return types.validateDispatchResult(result);
}

// ── helpers ────────────────────────────────────────────────────────────────

function tailorPrompt(userIntent, repo) {
  // In-process mode reuses the same prompt verbatim — the scout
  // tokenizer is the limiting factor anyway. Agent-driven dispatch
  // can produce repo-specific phrasing in the originating agent's
  // context before calling record().
  const repoLabel = path.basename(repo);
  return `In repo ${repoLabel}: ${userIntent}`;
}

function synthesizeInProcess({ userIntent, perRepoResults, failures }) {
  const successes = perRepoResults.filter((r) => !r.error);
  // ENH-034 — admonition at the TOP of the synthesis block so anyone
  // reading the in-process synthesis sees the mode caveat BEFORE the
  // per-repo summaries (previously buried at the bottom as a paren).
  const lines = [
    '> [!NOTE]',
    '> **MODE: CLI / in-process — keyword summaries only.**',
    '> For LLM synthesis, invoke /dispatch via an agent slash command.',
    '',
    `Dispatch across ${perRepoResults.length} repo(s) for: ${userIntent}`,
    '',
    `- ${successes.length} succeeded, ${failures.length} failed.`,
  ];
  if (successes.length) {
    lines.push('', '## Per-repo summaries');
    for (const r of successes) {
      const repoLabel = path.basename(r.repo);
      lines.push(`- **${repoLabel}** (${r.duration}ms): ${truncateForSynth(r.summary)}`);
    }
  }
  if (failures.length) {
    lines.push('', '## Failures');
    for (const f of failures) {
      const repoLabel = path.basename(f.repo);
      lines.push(`- **${repoLabel}**: ${f.error && f.error.message ? f.error.message : 'unknown error'}`);
    }
  }
  return lines.join('\n');
}

function oneLineSynthesis(perRepoResults, failures) {
  const okCount = perRepoResults.length - failures.length;
  return `${okCount}/${perRepoResults.length} succeeded${failures.length ? `, ${failures.length} failed` : ''}`;
}

function truncateForSynth(s) {
  if (!s) return '(empty)';
  if (s.length <= 200) return s.replace(/\n+/g, ' ');
  return s.slice(0, 200).replace(/\n+/g, ' ') + '…';
}

function renderArtifact({ runId, repos, userIntent, mode, modeNotes, perRepoResults, failures, synthesis, duration, isAgentDriven = false }) {
  // ENH-034 — admonition immediately under the Mode header so anyone
  // opening the artifact sees the CLI-degradation caveat before reading
  // the synthesis. Skip on agent-driven `record()` runs — those carry
  // a real LLM synthesis so the caveat would mislead.
  const modeAdmonition = isAgentDriven
    ? []
    : [
        '> [!NOTE]',
        '> **CLI / in-process mode — keyword summaries only.**',
        '> Invoke /dispatch via an agent slash command for true LLM synthesis.',
        '',
      ];
  const lines = [
    `# dispatch-${runId}`,
    '',
    `**User intent:** ${userIntent}`,
    `**Mode:** ${mode}${modeNotes.length ? ` (${modeNotes.join('; ')})` : ''}`,
    `**Repos (${repos.length}):**`,
    ...repos.map((r) => `  - ${r}`),
    `**Duration:** ${duration}ms`,
    '',
    ...modeAdmonition,
    '## Synthesis',
    '',
    synthesis || '(no synthesis recorded)',
    '',
    '## Per-repo results',
    '',
  ];
  for (const r of perRepoResults) {
    const repoLabel = path.basename(r.repo);
    lines.push(`### ${repoLabel}`, '');
    lines.push(`- **Prompt:** ${r.prompt || '(n/a)'}`);
    lines.push(`- **Duration:** ${r.duration != null ? r.duration : 'n/a'}ms`);
    if (r.error) {
      lines.push(`- **Error:** ${r.error.message}`);
    } else {
      lines.push(`- **Files read:** ${(r.filesRead || []).length}`);
      lines.push('', '```', r.summary || '(empty)', '```');
    }
    if (r.findings && r.findings.length) {
      lines.push('', 'Findings:');
      for (const f of r.findings) {
        lines.push(`  - **${f.kind || 'note'}**: ${f.title}`);
      }
    }
    lines.push('');
  }
  if (failures.length) {
    lines.push('## Failure manifest', '');
    for (const f of failures) {
      lines.push(`- ${path.basename(f.repo)}: ${f.error && f.error.message ? f.error.message : 'unknown'}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

module.exports = {
  dispatch,
  record,
  CLI_MODE_NOTICE,
  // exported for tests:
  tailorPrompt,
  synthesizeInProcess,
};
