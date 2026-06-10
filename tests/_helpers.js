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
 * Phase 16 — fake a tool event against an adapter's hooks.json to
 * exercise hook commands without booting a real agent runtime.
 *
 * Reads the adapter's hooks file (or settings.json for Claude Code),
 * finds the matching hook entry for the given event + tool name, and
 * exec's each `type: "command"` hook with the JSON payload on stdin
 * (matching the documented Codex/Claude Code hook protocol).
 *
 * Returns { exits: number[], stdouts: string[], stderrs: string[] }.
 *
 * Used by the hook-execution smoke harness (Group 3) to prove hooks
 * actually fire — not just install.
 *
 * @param {object} opts
 * @param {string} opts.hooksFile     absolute path to the adapter's hooks file
 * @param {string} opts.event         event name (e.g. 'PreToolUse')
 * @param {string} opts.toolName      matcher target (e.g. 'Write')
 * @param {object} opts.payload       JSON payload to pass on stdin
 * @param {string} opts.cwd           working directory for the hook commands
 * @returns {{exits: number[], stdouts: string[], stderrs: string[]}}
 */
function fakeToolEvent({ hooksFile, event, toolName, payload, cwd }) {
  if (!fs.existsSync(hooksFile)) {
    throw new Error(`fakeToolEvent: hooks file not found at ${hooksFile}`);
  }
  const config = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
  const eventBlock = config.hooks && config.hooks[event];
  if (!Array.isArray(eventBlock)) {
    return { exits: [], stdouts: [], stderrs: [] };
  }

  const exits = [];
  const stdouts = [];
  const stderrs = [];
  const payloadJson = JSON.stringify(payload || {});

  for (const entry of eventBlock) {
    const matcher = entry.matcher;
    if (matcher) {
      const matched = new RegExp(matcher).test(toolName);
      if (!matched) continue;
    }
    for (const hook of entry.hooks || []) {
      if (hook.type !== 'command') continue;
      const result = spawnSync('bash', ['-c', hook.command], {
        cwd: cwd || process.cwd(),
        input: payloadJson,
        encoding: 'utf8',
        timeout: 10000,
        env: {
          ...process.env,
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

module.exports = { REPO_ROOT, CLI, mktmp, rmrf, runCli, read, write, exists, fakeToolEvent };
