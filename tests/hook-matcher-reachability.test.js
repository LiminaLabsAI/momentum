'use strict';

// Hook matcher reachability (BUG-028, Phase 31a G0).
//
// THE CLASS THIS CLOSES
// ---------------------
// A hook script branches on a tool name that its own registered matcher can
// never deliver, so the branch is dead code. Momentum has now shipped this
// twice:
//
//   BUG-007 — adapters/codex/hooks.json used matcher `apply_patch|shell`, but
//             Codex's canonical tool_name for shell is `Bash`, so every Bash
//             call bypassed brainstorm-gate.sh AND check-history-reminder.sh.
//
//   BUG-028 — adapters/claude-code/settings.json used PostToolUse matcher
//             `Edit|Write`, while check-history-reminder.sh guards its
//             ecosystem session-log append on `[ "$TOOL_NAME" = "Bash" ]`.
//             The only code path that writes commit/PR events into
//             <eco>/sessions/ was unreachable on the DEFAULT adapter. Two
//             independent multi-repo sessions reported empty session logs
//             after ~10 commits and 5 PRs.
//
// Both shipped green because the existing tests invoke the hook SCRIPT
// directly with a synthesized `{tool_name: 'Bash'}` payload — bypassing the
// matcher, which is the very thing that was broken. A test that drives the
// script can never catch a defect in the wiring that feeds the script.
//
// So this test reads the INSTALLED adapter config and asserts reachability:
// for every explicit `$TOOL_NAME = "X"` equality guard in a hook script, if X
// is in that adapter's tool vocabulary, the adapter's matcher for that script
// MUST be able to deliver X.
//
// Scope note: we deliberately check only EQUALITY guards. brainstorm-gate.sh
// also has a `case` statement listing every adapter's tool names in one union
// (Write|Edit|MultiEdit, apply_patch|Bash, run_command|view_file) — that union
// is intentionally broader than any single adapter's matcher, so asserting on
// it would produce false positives. The equality guard is the exact shape both
// real defects took.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

// Tool names each agent runtime can actually emit. A script guard naming a
// tool outside its adapter's vocabulary is not a defect — brainstorm-gate.sh
// is shared across adapters by design.
const ADAPTER_TOOL_VOCABULARY = {
  'claude-code': ['Write', 'Edit', 'MultiEdit', 'Bash'],
  codex: ['apply_patch', 'Bash'],
};

// Adapters whose hook config is a JSON matcher table this test can read.
// - antigravity routes through a shim (antigravity-hook-adapter.sh) with
//   wildcard matchers, so matcher-vs-guard reachability is not expressible
//   the same way.
// - opencode uses a JS plugin (.opencode/plugins/momentum.js) that dispatches
//   on tool names in code rather than via a matcher string; it is covered by
//   the explicit assertion at the bottom of this file.
const MATCHER_ADAPTERS = [
  { adapter: 'claude-code', config: 'adapters/claude-code/settings.json' },
  { adapter: 'codex', config: 'adapters/codex/hooks.json' },
];

/**
 * Extract tool names a shell script explicitly compares $TOOL_NAME against.
 * Matches the shapes both real defects took:
 *   [ "$TOOL_NAME" = "Bash" ]
 *   [[ "$tool_name" == "Bash" ]]
 */
function extractEqualityGuards(scriptBody) {
  const found = new Set();
  const re = /\$\{?(?:TOOL_NAME|tool_name)\b[^"]*"?\s*==?\s*"([A-Za-z_][A-Za-z0-9_]*)"/g;
  let m;
  while ((m = re.exec(scriptBody)) !== null) found.add(m[1]);
  return [...found];
}

/**
 * Claude Code / Codex matchers are regexes matched against the tool name.
 * Anchor them so `Edit|Write` does not spuriously "match" inside another word.
 */
function matcherDelivers(matcher, toolName) {
  return new RegExp(`^(?:${matcher})$`).test(toolName);
}

/** Every (matcher, script) pair registered in an adapter's hook config. */
function registeredHooks(config) {
  const pairs = [];
  for (const event of Object.keys(config.hooks || {})) {
    for (const entry of config.hooks[event] || []) {
      const matcher = entry.matcher;
      if (typeof matcher !== 'string') continue; // SessionStart has no matcher
      for (const hook of entry.hooks || []) {
        const cmd = String(hook.command || '');
        const script = (cmd.match(/([A-Za-z0-9._-]+\.sh)/) || [])[1];
        if (script) pairs.push({ event, matcher, script });
      }
    }
  }
  return pairs;
}

for (const { adapter, config } of MATCHER_ADAPTERS) {
  test(`${adapter}: every hook script's tool guards are reachable through its matcher`, () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, config), 'utf8'));
    const vocabulary = ADAPTER_TOOL_VOCABULARY[adapter];
    const hooks = registeredHooks(cfg);

    assert.ok(hooks.length > 0, `${config}: expected at least one matcher-bearing hook`);

    for (const { event, matcher, script } of hooks) {
      const scriptPath = path.join(REPO_ROOT, 'core', 'scripts', script);
      if (!fs.existsSync(scriptPath)) continue;
      const body = fs.readFileSync(scriptPath, 'utf8');

      for (const tool of extractEqualityGuards(body)) {
        if (!vocabulary.includes(tool)) continue; // guard for a different runtime
        assert.ok(
          matcherDelivers(matcher, tool),
          `${config} ${event} matcher "${matcher}" can never deliver tool "${tool}", `
          + `but core/scripts/${script} branches on it — that branch is dead code. `
          + `Add "${tool}" to the matcher (this is the BUG-007 / BUG-028 class).`,
        );
      }
    }
  });
}

test('regression: the BUG-028 instance itself — claude-code PostToolUse reaches Bash', () => {
  // Pinned separately from the generic sweep above so the specific defect that
  // silently emptied two ecosystems' session logs can never quietly return,
  // even if the vocabulary/extraction heuristics above are later relaxed.
  const cfg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'adapters/claude-code/settings.json'), 'utf8'),
  );
  const post = (cfg.hooks.PostToolUse || []).find((e) => (e.hooks || [])
    .some((h) => String(h.command || '').includes('check-history-reminder.sh')));

  assert.ok(post, 'claude-code must register check-history-reminder.sh on PostToolUse');
  assert.ok(
    matcherDelivers(post.matcher, 'Bash'),
    `claude-code PostToolUse matcher "${post.matcher}" must deliver Bash — `
    + 'check-history-reminder.sh appends the ecosystem session log only on Bash '
    + '(commit/PR events). Without it, <eco>/sessions/ stays empty forever (BUG-028).',
  );
});

test('opencode plugin dispatches bash tool calls to the history reminder', () => {
  // opencode has no matcher string — its plugin decides in code. The
  // equivalent reachability guarantee is that tool.execute.after actually
  // routes bash completions into the reminder script.
  const plugin = fs.readFileSync(
    path.join(REPO_ROOT, '.opencode/plugins/momentum.js'), 'utf8',
  );
  const after = plugin.slice(plugin.indexOf('"tool.execute.after"'));
  assert.ok(
    /tool === "bash"/.test(after),
    'opencode plugin tool.execute.after must handle bash tool calls so commit/PR '
    + 'events reach the ecosystem session log (the opencode analogue of BUG-028)',
  );
});
