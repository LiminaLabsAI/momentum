'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CLI = path.join(REPO_ROOT, 'bin', 'momentum.js');

function mktmp(prefix = 'momentum-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function rmrf(dir) {
  if (!dir || !fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function runCli(args, opts = {}) {
  return spawnSync('node', [CLI, ...args], {
    encoding: 'utf8',
    timeout: 15000,
    ...opts,
  });
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function write(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

function exists(p) {
  return fs.existsSync(p);
}

/**
 * Phase 16 Rework G0.6 — fake a tool event against an adapter's hook
 * config to exercise hook commands without booting a real agent runtime.
 *
 * Reads the adapter's hooks file (or settings.json for Claude Code),
 * finds matching hook entries for the given event + tool name, and
 * exec's each `type: "command"` hook with the JSON payload on stdin.
 *
 * Pins CLAUDE_PROJECT_DIR + MOMENTUM_PROJECT_DIR to the simulated
 * project root so hook scripts resolve against the test tmp dir, not
 * any ambient env from the outer runner.
 *
 * Returns { exits, stdouts, stderrs } — arrays per matching hook.
 *
 * @param {object} opts
 * @param {string} opts.hooksFile   absolute path to the hooks config (hooks.json or settings.json)
 * @param {string} opts.event       event name (PreToolUse, PostToolUse, SessionStart)
 * @param {string} opts.toolName    matcher target (Write, apply_patch, run_command, etc.)
 * @param {object} opts.payload     JSON payload to pass on stdin
 * @param {string} opts.cwd         working directory for the hook commands (= project root)
 */
function fakeToolEvent({ hooksFile, event, toolName, payload, cwd }) {
  if (!fs.existsSync(hooksFile)) {
    throw new Error(`fakeToolEvent: hooks file not found at ${hooksFile}`);
  }
  const { spawnSync } = require('node:child_process');
  const config = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));

  // Two schemas (Phase 22b, ADR-0005):
  //  - legacy wrapper  {hooks: {Event: [...]}}          (Claude Code, Codex)
  //  - vendor named groups {name: {Event: [...]}, ...}  (Antigravity 2.x)
  // Antigravity runs hook commands with CWD = the hooks.json directory and
  // grouped (matcher) structure only for tool events; loop events are FLAT
  // handler lists. Model both faithfully.
  const vendorSchema = !config.hooks;
  const entries = [];
  if (!vendorSchema) {
    const eventBlock = config.hooks && config.hooks[event];
    if (Array.isArray(eventBlock)) entries.push(...eventBlock);
  } else {
    for (const groupName of Object.keys(config)) {
      const group = config[groupName];
      if (!group || typeof group !== 'object') continue;
      if (group.enabled === false) continue;
      const eventBlock = group[event];
      if (!Array.isArray(eventBlock)) continue;
      for (const item of eventBlock) {
        if (item && Array.isArray(item.hooks)) {
          entries.push(item); // grouped (tool events)
        } else if (item && item.command) {
          entries.push({ hooks: [{ type: item.type || 'command', ...item }] }); // flat (loop events)
        }
      }
    }
  }
  if (entries.length === 0) {
    return { exits: [], stdouts: [], stderrs: [] };
  }

  const exits = [];
  const stdouts = [];
  const stderrs = [];
  const payloadJson = JSON.stringify(payload || {});
  const projectDir = cwd || process.cwd();
  // Vendor rule (fact-sheet §5): commands run from the hooks.json directory.
  const hookCwd = vendorSchema ? path.dirname(hooksFile) : projectDir;

  for (const entry of entries) {
    if (entry.matcher && entry.matcher !== '*' && entry.matcher !== '') {
      const matched = new RegExp(entry.matcher).test(toolName || '');
      if (!matched) continue;
    }
    for (const hook of entry.hooks || []) {
      if ((hook.type || 'command') !== 'command') continue;
      const result = spawnSync('bash', ['-c', hook.command], {
        cwd: hookCwd,
        input: payloadJson,
        encoding: 'utf8',
        timeout: 10000,
        env: {
          ...process.env,
          // Pin both Claude and momentum project-root env vars to the
          // simulated project root. Without this, the helper inherits
          // CLAUDE_PROJECT_DIR from the outer Claude Code session.
          CLAUDE_PROJECT_DIR: projectDir,
          MOMENTUM_PROJECT_DIR: projectDir,
          CLAUDE_HOOK_EVENT: event,
          CLAUDE_TOOL_NAME: toolName,
        },
      });
      exits.push(result.status === null ? -1 : result.status);
      stdouts.push(result.stdout || '');
      stderrs.push(result.stderr || '');
    }
  }
  return { exits, stdouts, stderrs };
}

/**
 * Phase 16 Rework — convenience payload builders per platform.
 *
 * Each agent's runtime ships a different JSON shape on hook stdin.
 * Use these to build platform-correct test fixtures.
 */
const payloads = {
  /**
   * Claude Code shape: { tool_name, tool_input: { file_path } }
   */
  claudeCode(toolName, filePath) {
    return { tool_name: toolName, tool_input: { file_path: filePath } };
  },
  /**
   * Codex apply_patch shape: { tool_name: 'apply_patch', tool_input: { input: "*** Update File: <path>\n..." } }
   * brainstorm-gate parser scans the input for `*** Update File:` / `*** Add File:` lines.
   */
  codexApplyPatch(filePath) {
    return {
      tool_name: 'apply_patch',
      tool_input: {
        input: `*** Begin Patch\n*** Update File: ${filePath}\n@@ ... @@\n*** End Patch\n`,
      },
    };
  },
  /**
   * Codex Bash shape: { tool_name: 'Bash', tool_input: { command: "echo > <path>" } }
   * Per Codex docs (https://developers.openai.com/codex/hooks) the canonical
   * tool_name emitted for shell commands is "Bash" — NOT "shell".
   */
  codexBash(command) {
    return { tool_name: 'Bash', tool_input: { command } };
  },
  /**
   * Antigravity 2.x payload shapes — camelCase protojson, captured live from
   * agy 1.0.16 (Phase 22b: specs/phases/phase-22b-antigravity-2-adoption/
   * evidence/hook-captures/). workspacePaths[0] is the project root.
   */
  antigravityCommon(workspaceDir) {
    return {
      conversationId: '00000000-0000-4000-8000-000000000000',
      workspacePaths: [workspaceDir],
      transcriptPath: `${workspaceDir}/.transcript.jsonl`,
      artifactDirectoryPath: `${workspaceDir}/.artifacts`,
      modelName: 'test',
    };
  },
  antigravityPreTool(workspaceDir, toolName, args, stepIdx = 1) {
    return { ...payloads.antigravityCommon(workspaceDir), stepIdx, toolCall: { name: toolName, args } };
  },
  antigravityWriteToFile(workspaceDir, targetFile, stepIdx = 1) {
    return payloads.antigravityPreTool(workspaceDir, 'write_to_file', {
      TargetFile: targetFile,
      CodeContent: 'x',
      Overwrite: true,
    }, stepIdx);
  },
  antigravityRunCommand(workspaceDir, commandLine, stepIdx = 1) {
    return payloads.antigravityPreTool(workspaceDir, 'run_command', {
      CommandLine: commandLine,
      Cwd: workspaceDir,
    }, stepIdx);
  },
  antigravityPostTool(workspaceDir, toolName, args, error = '') {
    return { ...payloads.antigravityCommon(workspaceDir), stepIdx: 2, error, toolCall: toolName ? { name: toolName, args } : null };
  },
  antigravityPreInvocation(workspaceDir, invocationNum) {
    return { ...payloads.antigravityCommon(workspaceDir), invocationNum, initialNumSteps: 1 };
  },
};

module.exports = { REPO_ROOT, CLI, mktmp, rmrf, runCli, read, write, exists, fakeToolEvent, payloads };
