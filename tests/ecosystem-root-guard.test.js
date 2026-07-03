'use strict';

// BUG-016 — ecosystem-root guard + coordination-root instruction self-heal.
//
// (1) Project-mode `momentum init` / `momentum upgrade` must REFUSE to run in
//     an ecosystem coordination root (a directory whose ecosystem.json has
//     both `name` and a `members` array) instead of installing the
//     phase-project scaffold over it. That scaffold points every agent
//     session at specs/status.md — a file that can never exist there.
// (2) `momentum ecosystem upgrade` writes/refreshes the root's OWN
//     CLAUDE.md / AGENTS.md: retrofit for pre-ENH-025 roots (files missing),
//     repair for BUG-016-damaged roots (project template present), refresh
//     for stale ecosystem templates — always preserving user content under
//     `## Project Extensions` and never touching non-momentum files.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');

function makeEco() {
  const tmp = mktmp();
  const init = runCli(['ecosystem', 'init', 'eco'], { cwd: tmp });
  assert.equal(init.status, 0, `ecosystem init failed: ${init.stderr}`);
  return { tmp, root: path.join(tmp, 'eco') };
}

// A minimal but marker-bearing copy of the phase-project template — the exact
// artifact BUG-016 left behind in a live coordination root.
function projectTemplate(extensionsTail) {
  return [
    '# Project Rules: eco',
    '',
    '> Claude Code configuration for this project.',
    '',
    '> **First file to read: ALWAYS `specs/status.md`.**',
    '',
    '---',
    '',
    '## Project Extensions',
    '',
    '> Everything below this heading is preserved across `momentum upgrade`.',
    '> Anything above this heading is managed by momentum and may be replaced on upgrade.',
    ...(extensionsTail ? ['', ...extensionsTail] : []),
    '',
  ].join('\n');
}

// ── (1) the guard ────────────────────────────────────────────────────────────

test('init — refuses to install the project scaffold into an ecosystem root', () => {
  const { tmp, root } = makeEco();
  try {
    const res = runCli(['init', root, '--agent', 'claude-code']);
    assert.notEqual(res.status, 0, 'init in a coordination root must exit non-zero');
    assert.match(res.stderr, /coordination root of ecosystem "eco"/);
    assert.match(res.stderr, /momentum ecosystem upgrade/);
    // Nothing from the project scaffold landed. (`.claude/commands/` itself
    // legitimately exists since ENH-049 — ecosystem init ships the
    // coordination surface — so assert on project-only markers instead.)
    assert.ok(!fs.existsSync(path.join(root, 'specs')), 'specs/ must not be scaffolded');
    assert.ok(!fs.existsSync(path.join(root, '.githooks')), '.githooks/ must not be scaffolded');
    assert.ok(
      !fs.existsSync(path.join(root, '.claude', 'commands', 'start-phase.md')),
      'project-layer commands must not be scaffolded',
    );
    // The ecosystem instruction surface is untouched.
    assert.match(
      fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'),
      /Ecosystem \(Coordination Layer\)/,
    );
  } finally {
    rmrf(tmp);
  }
});

test('upgrade — refuses to run project-mode in an ecosystem root', () => {
  const { tmp, root } = makeEco();
  try {
    const before = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
    const res = runCli(['upgrade', root, '--agent', 'claude-code']);
    assert.notEqual(res.status, 0, 'upgrade in a coordination root must exit non-zero');
    assert.match(res.stderr, /coordination root of ecosystem "eco"/);
    assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), before);
    assert.ok(!fs.existsSync(path.join(root, 'CLAUDE.md.bak')));
  } finally {
    rmrf(tmp);
  }
});

test('init — a foreign (non-momentum) ecosystem.json does not trip the guard', () => {
  const tmp = mktmp();
  try {
    // PM2-style manifest: no top-level `name` + `members` pair.
    const dir = path.join(tmp, 'app');
    fs.mkdirSync(dir);
    fs.writeFileSync(
      path.join(dir, 'ecosystem.json'),
      JSON.stringify({ apps: [{ name: 'web', script: 'index.js' }] }, null, 2),
    );
    const res = runCli(['init', dir, '--agent', 'claude-code']);
    assert.equal(res.status, 0, `init should proceed: ${res.stderr}`);
    assert.ok(fs.existsSync(path.join(dir, 'specs', 'status.md')));
  } finally {
    rmrf(tmp);
  }
});

// ── (2) the self-heal ────────────────────────────────────────────────────────

test('ecosystem upgrade — retrofits missing root CLAUDE.md/AGENTS.md, then is idempotent', () => {
  const { tmp, root } = makeEco();
  try {
    // Simulate a pre-ENH-025 root: instruction surfaces never written.
    fs.rmSync(path.join(root, 'CLAUDE.md'));
    fs.rmSync(path.join(root, 'AGENTS.md'));

    const res = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /\+ added: CLAUDE\.md/);
    assert.match(res.stdout, /\+ added: AGENTS\.md/);
    const claude = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
    assert.match(claude, /^# eco — Ecosystem \(Coordination Layer\)/);
    assert.doesNotMatch(claude, /\{\{NAME\}\}/);

    const again = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /= CLAUDE\.md up to date/);
    assert.match(again.stdout, /= AGENTS\.md up to date/);
    assert.ok(!fs.existsSync(path.join(root, 'CLAUDE.md.bak')));
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem upgrade — repairs a BUG-016 project-template CLAUDE.md, preserving user extensions', () => {
  const { tmp, root } = makeEco();
  try {
    fs.writeFileSync(
      path.join(root, 'CLAUDE.md'),
      projectTemplate(['### My cross-repo notes', 'Deploy order: infra first.']),
    );

    const res = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /↻ repaired: CLAUDE\.md — project template found in a coordination root \(BUG-016\)/);

    const healed = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
    assert.match(healed, /^# eco — Ecosystem \(Coordination Layer\)/);
    assert.match(healed, /Deploy order: infra first\./, 'user extensions must survive the repair');
    assert.doesNotMatch(healed, /ALWAYS `specs\/status\.md`/, 'project managed section must be gone');
    assert.ok(fs.existsSync(path.join(root, 'CLAUDE.md.bak')), 'original saved as .bak');
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem upgrade — boilerplate-only extensions tail is swapped for the ecosystem tail', () => {
  const { tmp, root } = makeEco();
  try {
    fs.writeFileSync(path.join(root, 'CLAUDE.md'), projectTemplate(null));

    const res = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    const healed = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
    // The project-flavored boilerplate is replaced by the template's own tail.
    assert.match(healed, /Add ecosystem-specific notes/);
    assert.doesNotMatch(healed, /# Project Rules:/);
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem upgrade — leaves a non-momentum CLAUDE.md untouched', () => {
  const { tmp, root } = makeEco();
  try {
    const custom = '# My own rules\n\nHands off, tooling.\n';
    fs.writeFileSync(path.join(root, 'CLAUDE.md'), custom);

    const res = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /CLAUDE\.md exists but is not momentum-managed — left untouched/);
    assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), custom);
    assert.ok(!fs.existsSync(path.join(root, 'CLAUDE.md.bak')));
  } finally {
    rmrf(tmp);
  }
});

test('ecosystem upgrade --dry-run — reports the repair without writing', () => {
  const { tmp, root } = makeEco();
  try {
    const damaged = projectTemplate(['user note']);
    fs.writeFileSync(path.join(root, 'CLAUDE.md'), damaged);

    const res = runCli(['ecosystem', 'upgrade', '--dry-run'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /✋ would repair: CLAUDE\.md/);
    assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), damaged);
    assert.ok(!fs.existsSync(path.join(root, 'CLAUDE.md.bak')));
  } finally {
    rmrf(tmp);
  }
});
