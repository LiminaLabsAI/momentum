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
  const eventBlock = config.hooks && config.hooks[event];
  if (!Array.isArray(eventBlock)) {
    return { exits: [], stdouts: [], stderrs: [] };
  }

  const exits = [];
  const stdouts = [];
  const stderrs = [];
  const payloadJson = JSON.stringify(payload || {});
  const projectDir = cwd || process.cwd();

  for (const entry of eventBlock) {
    if (entry.matcher) {
      const matched = new RegExp(entry.matcher).test(toolName);
      if (!matched) continue;
    }
    for (const hook of entry.hooks || []) {
      if (hook.type !== 'command') continue;
      const result = spawnSync('bash', ['-c', hook.command], {
        cwd: projectDir,
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
   * Antigravity run_command shape: { tool_name: 'run_command', tool_input: { command, path } }
   */
  antigravityRunCommand(command, filePath) {
    return { tool_name: 'run_command', tool_input: { command, path: filePath } };
  },
  /**
   * Antigravity view_file shape: { tool_name: 'view_file', tool_input: { path } }
   */
  antigravityViewFile(filePath) {
    return { tool_name: 'view_file', tool_input: { path: filePath } };
  },
};

module.exports = { REPO_ROOT, CLI, mktmp, rmrf, runCli, read, write, exists, fakeToolEvent, payloads };
