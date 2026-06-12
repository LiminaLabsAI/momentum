'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');

function setupFixture(tmp) {
  // Create a minimal ecosystem with two members so swarm CLI can
  // resolve member paths.
  const eco = {
    name: 'test-eco', version: 1, created: '2026-06-12',
    members: [
      { id: 'a', path: 'a', role: 'library' },
      { id: 'b', path: 'b', role: 'platform' },
    ],
    dependencies: [{ from: 'b', to: 'a', kind: 'library' }],
  };
  fs.writeFileSync(path.join(tmp, 'ecosystem.json'), JSON.stringify(eco, null, 2));
  for (const m of eco.members) {
    fs.mkdirSync(path.join(tmp, m.path, 'specs', 'phases', 'phase-1-foo'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, m.path, 'specs', 'phases', 'phase-1-foo', 'overview.md'),
      '# Phase 1 — Foo\n',
    );
  }
  fs.mkdirSync(path.join(tmp, 'initiatives'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'initiatives', '0001-foo.md'),
    '---\nid: 1\nslug: foo\nstatus: in-progress\nstarted: 2026-06-12\nowner: test\nrepos: [a, b]\n---\n\n# Foo\n',
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI — swarm start
// ─────────────────────────────────────────────────────────────────────────────

test('momentum swarm start — dry-run creates manifest + board + waves', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const r = runCli(
      ['swarm', 'start', 'foo',
        '--initiative', 'foo',
        '--repos', 'a,b',
        '--phase', 'phase-1-foo',
        '--mode', 'checkpoint',
        '--ecosystem', tmp,
        '--json'],
      { cwd: tmp },
    );
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    const out = JSON.parse(r.stdout);
    assert.equal(out.swarmId, '0001-foo');
    assert.ok(out.sessionId);
    assert.ok(fs.existsSync(out.manifestPath));
    assert.equal(out.directives.length, 1, 'wave 1 = repo a');
    assert.equal(out.directives[0].repoId, 'a');
    assert.equal(out.directives[0].platform, 'claude-code');

    // board.json materialized
    const boardPath = path.join(tmp, 'swarms', '0001-foo', 'board.json');
    assert.ok(fs.existsSync(boardPath));
    const board = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
    assert.equal(board.swarm_id, '0001-foo');
    assert.equal(board.repos.length, 2);

    // Reserved dirs present
    for (const d of ['contracts', 'inbox', 'signals', 'tokens', 'details', 'changes']) {
      assert.ok(fs.existsSync(path.join(tmp, 'swarms', '0001-foo', d)),
        `${d}/ should exist`);
    }
  } finally {
    rmrf(tmp);
  }
});

test('momentum swarm start — defaults to checkpoint mode', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const r = runCli(
      ['swarm', 'start', 'foo',
        '--initiative', 'foo',
        '--repos', 'a,b',
        '--phase', 'phase-1-foo',
        '--ecosystem', tmp,
        '--json'],
      { cwd: tmp },
    );
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    const manifest = JSON.parse(fs.readFileSync(out.manifestPath, 'utf8'));
    assert.equal(manifest.mode, 'checkpoint');
  } finally {
    rmrf(tmp);
  }
});

test('momentum swarm start — rejects missing initiative', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const r = runCli(
      ['swarm', 'start', 'foo',
        '--repos', 'a,b',
        '--phase', 'phase-1-foo',
        '--ecosystem', tmp],
      { cwd: tmp },
    );
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--initiative/);
  } finally {
    rmrf(tmp);
  }
});

test('momentum swarm start — rejects empty --repos', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const r = runCli(
      ['swarm', 'start', 'foo',
        '--initiative', 'foo',
        '--phase', 'phase-1-foo',
        '--ecosystem', tmp],
      { cwd: tmp },
    );
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--repos/);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CLI — swarm status
// ─────────────────────────────────────────────────────────────────────────────

test('momentum swarm status — renders board as table', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    runCli(
      ['swarm', 'start', 'foo', '--initiative', 'foo', '--repos', 'a,b',
        '--phase', 'phase-1-foo', '--ecosystem', tmp, '--json'],
      { cwd: tmp },
    );
    const r = runCli(['swarm', 'status', '0001-foo', '--ecosystem', tmp], { cwd: tmp });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /Swarm 0001-foo/);
    assert.match(r.stdout, /repo\s+wave\s+status/);
    assert.match(r.stdout, /^\s+a\s+1\s+queued/m);
    assert.match(r.stdout, /^\s+b\s+2\s+queued/m);
  } finally {
    rmrf(tmp);
  }
});

test('momentum swarm status --json — emits machine-readable board', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    runCli(
      ['swarm', 'start', 'foo', '--initiative', 'foo', '--repos', 'a,b',
        '--phase', 'phase-1-foo', '--ecosystem', tmp, '--json'],
      { cwd: tmp },
    );
    const r = runCli(['swarm', 'status', '0001-foo', '--ecosystem', tmp, '--json'], { cwd: tmp });
    assert.equal(r.status, 0);
    const board = JSON.parse(r.stdout);
    assert.equal(board.swarm_id, '0001-foo');
    assert.equal(board.repos.length, 2);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CLI — swarm cancel
// ─────────────────────────────────────────────────────────────────────────────

test('momentum swarm cancel — moves swarm to cancelled', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    runCli(
      ['swarm', 'start', 'foo', '--initiative', 'foo', '--repos', 'a,b',
        '--phase', 'phase-1-foo', '--ecosystem', tmp, '--json'],
      { cwd: tmp },
    );
    const r = runCli(['swarm', 'cancel', '0001-foo', '--reason', 'changed mind', '--ecosystem', tmp],
      { cwd: tmp });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /cancelled/);

    const manifestFile = path.join(tmp, 'swarms', '0001-foo', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    assert.equal(manifest.status, 'cancelled');
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CLI — help
// ─────────────────────────────────────────────────────────────────────────────

test('momentum swarm --help — prints usage', () => {
  const r = runCli(['swarm', '--help']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /momentum swarm/);
  assert.match(r.stdout, /start/);
  assert.match(r.stdout, /status/);
  assert.match(r.stdout, /cancel/);
});

test('momentum swarm <bogus> — clear error', () => {
  const r = runCli(['swarm', 'bogus-cmd']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /unknown subcommand/);
});

test('momentum --help mentions swarm', () => {
  const r = runCli(['--help']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /momentum swarm/);
});
