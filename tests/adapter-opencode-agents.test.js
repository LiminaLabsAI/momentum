'use strict';

/**
 * Phase 22 G3 — opencode agents shape + spawn contract.
 *
 * Agents are markdown files at `.opencode/agents/<name>.md`
 * (https://opencode.ai/docs/agents/). The three reviewers must be true
 * read-only: `mode: subagent` + `permission: edit: deny` — sandbox-level,
 * not just prompt-level. spawn() shells
 * `opencode run --dir <repoPath> --agent swarm-supervisor "<directive>"`.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, REPO_ROOT } = require('./_helpers');

const REVIEWERS = [
  'momentum-reviewer-architecture',
  'momentum-reviewer-qa',
  'momentum-reviewer-security',
];

function frontmatterOf(body) {
  const m = body.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, 'agent file must start with YAML frontmatter');
  return m[1];
}

test('all four momentum agents install at .opencode/agents/ with required frontmatter', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'opencode']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    const agentsDir = path.join(target, '.opencode', 'agents');

    for (const name of REVIEWERS) {
      const body = fs.readFileSync(path.join(agentsDir, `${name}.md`), 'utf8');
      const fm = frontmatterOf(body);
      assert.match(fm, /^description: .+$/m, `${name}: description required`);
      assert.match(fm, /^mode: subagent$/m, `${name}: reviewers must be mode subagent`);
      assert.match(fm, /^\s+edit: deny$/m, `${name}: reviewers must deny edit permission`);
      assert.match(fm, /^\s+"\*": deny$/m, `${name}: reviewers must default-deny bash`);
    }

    const sup = fs.readFileSync(path.join(agentsDir, 'swarm-supervisor.md'), 'utf8');
    const supFm = frontmatterOf(sup);
    assert.match(supFm, /^description: .+$/m);
    assert.match(supFm, /^mode: all$/m, 'supervisor runs as spawned primary AND task subagent');
    assert.doesNotMatch(supFm, /edit: deny/, 'supervisor writes code — must not be read-only');
  } finally {
    rmrf(target);
  }
});

test('spawn() dispatches `opencode run --dir <repo> --agent swarm-supervisor` with the boot directive', () => {
  const adapter = require(path.join(REPO_ROOT, 'adapters', 'opencode', 'adapter.js'));
  const stubDir = mktmp();
  try {
    // Stub binary records its argv so we can assert the exact arg shape.
    const argsFile = path.join(stubDir, 'argv.txt');
    const stub = path.join(stubDir, 'opencode-stub.sh');
    fs.writeFileSync(stub, `#!/bin/sh\nprintf '%s\\n' "$@" > "${argsFile}"\nexit 0\n`);
    fs.chmodSync(stub, 0o755);
    process.env.OPENCODE_BIN = stub;

    const result = adapter.spawn({
      platform: 'opencode',
      swarmId: '0001-test',
      wave: 1,
      repoId: 'repo-a',
      repoPath: '/tmp/momentum-test-spawn-fake',
      phaseSlug: 'phase-1-test',
      branch: 'phase-1-test',
      sessionId: 'sess_test',
      recipePath: '/dev/null',
      contextPath: null,
      env: {},
    });

    assert.equal(result.status, 0, `stub spawn should succeed: ${result.detail}`);
    assert.equal(result.repoId, 'repo-a');
    // The prompt arg is multi-line, so re-join everything after the flags
    // rather than treating each output line as one argv entry.
    const lines = fs.readFileSync(argsFile, 'utf8').split('\n').filter(Boolean);
    assert.deepEqual(lines.slice(0, 5), [
      'run',
      '--dir',
      '/tmp/momentum-test-spawn-fake',
      '--agent',
      'swarm-supervisor',
    ]);
    const prompt = lines.slice(5).join('\n');
    assert.match(prompt, /swarm supervisor/i, 'boot directive rides as the run message');
    assert.match(prompt, /phase-1-test/, 'directive must reference the phase slug');
  } finally {
    delete process.env.OPENCODE_BIN;
    rmrf(stubDir);
  }
});

test('spawn() returns canonical -1 when opencode is missing or platform mismatches', () => {
  const adapter = require(path.join(REPO_ROOT, 'adapters', 'opencode', 'adapter.js'));

  process.env.OPENCODE_BIN = path.join(os.tmpdir(), 'does-not-exist-opencode');
  try {
    const missing = adapter.spawn({
      platform: 'opencode',
      repoId: 'repo-a',
      repoPath: '/tmp/x',
      phaseSlug: 'p',
      swarmId: 's',
      wave: 1,
      recipePath: '/dev/null',
      env: {},
    });
    assert.equal(missing.status, -1);
    assert.ok(missing.detail.length > 0, 'detail must explain the launch failure');
  } finally {
    delete process.env.OPENCODE_BIN;
  }

  const mismatch = adapter.spawn({ platform: 'codex', repoId: 'repo-b' });
  assert.equal(mismatch.status, -1);
  assert.match(mismatch.detail, /non-opencode platform/);
});
