'use strict';

/**
 * ENH-025 — `momentum ecosystem init` auto-writes managed CLAUDE.md
 * and AGENTS.md so any agent opening the coordination root immediately
 * learns it is NOT a project and discovers the orchestration primitives.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, read, exists } = require('./_helpers');

test('ecosystem init writes managed CLAUDE.md + AGENTS.md', () => {
  const tmp = mktmp();
  try {
    const r = runCli(['ecosystem', 'init', 'mything'], { cwd: tmp });
    assert.equal(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);

    const root = path.join(tmp, 'mything');
    assert.ok(exists(path.join(root, 'CLAUDE.md')), 'CLAUDE.md should exist');
    assert.ok(exists(path.join(root, 'AGENTS.md')), 'AGENTS.md should exist');

    // stdout mentions the two files so users see what was created
    assert.match(r.stdout, /\+ CLAUDE\.md/, 'stdout should mention CLAUDE.md');
    assert.match(r.stdout, /\+ AGENTS\.md/, 'stdout should mention AGENTS.md');
  } finally {
    rmrf(tmp);
  }
});

test('managed CLAUDE.md substitutes {{NAME}} with the ecosystem name', () => {
  const tmp = mktmp();
  try {
    runCli(['ecosystem', 'init', 'my-eco'], { cwd: tmp });
    const claude = read(path.join(tmp, 'my-eco', 'CLAUDE.md'));
    assert.match(claude, /^# my-eco — Ecosystem \(Coordination Layer\)/m);
    assert.doesNotMatch(claude, /\{\{NAME\}\}/, 'no unsubstituted placeholders');
  } finally {
    rmrf(tmp);
  }
});

test('managed CLAUDE.md tells agents this is a coordination layer, not a project', () => {
  const tmp = mktmp();
  try {
    runCli(['ecosystem', 'init', 'demo'], { cwd: tmp });
    const claude = read(path.join(tmp, 'demo', 'CLAUDE.md'));

    // Core anti-pattern guidance
    assert.match(claude, /NOT a project/);
    assert.match(claude, /NEVER plan implementation here/);
    // No specs/ guidance
    assert.match(claude, /no `specs\/` here/i);
    // Initiative routing rule
    assert.match(claude, /momentum ecosystem initiative create/);
  } finally {
    rmrf(tmp);
  }
});

test('managed CLAUDE.md lists all orchestration primitives', () => {
  const tmp = mktmp();
  try {
    runCli(['ecosystem', 'init', 'demo'], { cwd: tmp });
    const claude = read(path.join(tmp, 'demo', 'CLAUDE.md'));

    assert.match(claude, /\/scout/, '/scout listed');
    assert.match(claude, /\/dispatch/, '/dispatch listed');
    assert.match(claude, /\/handoff/, '/handoff listed');
    assert.match(claude, /\/continue/, '/continue listed');
    assert.match(claude, /\/initiative/, '/initiative listed');
    assert.match(claude, /\/session/, '/session listed');
  } finally {
    rmrf(tmp);
  }
});

test('managed CLAUDE.md flags dispatch CLI degradation', () => {
  const tmp = mktmp();
  try {
    runCli(['ecosystem', 'init', 'demo'], { cwd: tmp });
    const claude = read(path.join(tmp, 'demo', 'CLAUDE.md'));

    // Future agents reading this should not be tempted to use the CLI
    // dispatch surface for cross-repo synthesis.
    assert.match(
      claude,
      /Do NOT use `momentum dispatch` from the CLI for synthesis/,
      'CLI dispatch degradation warning present',
    );
  } finally {
    rmrf(tmp);
  }
});

test('managed CLAUDE.md has Project Extensions marker for upgrade-safety', () => {
  const tmp = mktmp();
  try {
    runCli(['ecosystem', 'init', 'demo'], { cwd: tmp });
    const claude = read(path.join(tmp, 'demo', 'CLAUDE.md'));
    const agents = read(path.join(tmp, 'demo', 'AGENTS.md'));

    assert.match(claude, /^## Project Extensions$/m);
    assert.match(agents, /^## Project Extensions$/m);
  } finally {
    rmrf(tmp);
  }
});

test('AGENTS.md has same coordination-layer content as CLAUDE.md (modulo a couple of word swaps)', () => {
  const tmp = mktmp();
  try {
    runCli(['ecosystem', 'init', 'demo'], { cwd: tmp });
    const claude = read(path.join(tmp, 'demo', 'CLAUDE.md'));
    const agents = read(path.join(tmp, 'demo', 'AGENTS.md'));

    // Both surfaces should carry the core guardrails.
    assert.match(agents, /NOT a project/);
    assert.match(agents, /NEVER plan implementation here/);
    assert.match(agents, /momentum ecosystem initiative create/);
    // Both list the primitives.
    for (const slash of ['/scout', '/dispatch', '/handoff', '/continue', '/initiative', '/session']) {
      assert.ok(agents.includes(slash), `AGENTS.md missing ${slash}`);
    }
    // Wording differs slightly ("slash command" vs "agent command") but
    // both surfaces must have a primitives table.
    assert.match(claude, /Orchestration primitives/);
    assert.match(agents, /Orchestration primitives/);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem init is idempotent for CLAUDE.md / AGENTS.md (never overwrites existing)', () => {
  const tmp = mktmp();
  try {
    runCli(['ecosystem', 'init', 'demo'], { cwd: tmp });
    const root = path.join(tmp, 'demo');

    // Simulate user customisation of the managed file
    const customised = '# Custom ecosystem header — DO NOT OVERWRITE\n';
    fs.writeFileSync(path.join(root, 'CLAUDE.md'), customised, 'utf8');
    fs.writeFileSync(path.join(root, 'AGENTS.md'), customised, 'utf8');

    // Re-running init in the same directory should fail (ecosystem.json
    // already exists) so the idempotency we care about is at the
    // `writeManagedInstructionFile` level. Verify by deleting
    // ecosystem.json and re-init'ing.
    fs.rmSync(path.join(root, 'ecosystem.json'));
    runCli(['ecosystem', 'init', 'demo'], { cwd: tmp });

    assert.equal(
      fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'),
      customised,
      'existing CLAUDE.md preserved on re-init',
    );
    assert.equal(
      fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'),
      customised,
      'existing AGENTS.md preserved on re-init',
    );
  } finally {
    rmrf(tmp);
  }
});
