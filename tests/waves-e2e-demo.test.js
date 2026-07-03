'use strict';

/**
 * Phase 21c G3 — the 3-ideas end-to-end demo (FEAT-028 target UX):
 * N ideas → dependency-annotated phases → computed waves → lanes opened
 * per wave → sequenced landings through the merge queue → next wave
 * unblocks.
 *
 * Evidence capture: when MOMENTUM_DEMO_EVIDENCE is set to a file path,
 * the test ALSO writes a tmp-path-sanitized transcript there (one-shot,
 * run via scripts/capture-three-ideas-demo.sh). `npm test` never sets
 * it, so committed evidence is not rewritten by test runs (TD-006
 * lesson c).
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, runCli } = require('./_helpers');

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

test('three ideas → waves → lanes → sequenced landings → next wave unblocks', () => {
  const container = mktmp('momentum-3ideas-');
  const dir = path.join(container, 'app');
  fs.mkdirSync(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 'T');
  git(dir, 'config', 'commit.gpgsign', 'false');

  const transcript = [];
  const record = (cmd, out) => transcript.push(`$ ${cmd}\n${out.trim()}\n`);
  const cli = (label, args) => {
    const res = runCli(args, { cwd: dir });
    record(label, res.stdout + (res.stderr || ''));
    return res;
  };

  try {
    // Three ideas: auth and api are independent; ui depends on both.
    write(path.join(dir, 'specs', 'phases', 'index.json'), JSON.stringify({
      version: 1,
      phases: {
        'phase-1-auth': { status: 'planned', topics: [] },
        'phase-2-api': { status: 'planned', topics: [] },
        'phase-3-ui': { status: 'planned', topics: [], deps: ['phase-1-auth', 'phase-2-api'] },
      },
    }, null, 2));
    write(path.join(dir, 'README.md'), 'three ideas demo\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'chore: scaffold');

    // 1. Plan: waves computed from the annotations.
    const w1 = cli('momentum waves', ['waves']);
    assert.equal(w1.status, 0, w1.stderr);
    assert.match(w1.stdout, /wave 1: phase-1-auth {2}phase-2-api|wave 1: phase-1-auth +phase-2-api/);
    assert.match(w1.stdout, /wave 2: phase-3-ui/);
    assert.match(w1.stdout, /momentum lanes open phase-1-auth/);

    // 2. Open a lane per wave-1 node (worktrees created by the CLI).
    for (const p of ['phase-1-auth', 'phase-2-api']) {
      const res = cli(`momentum lanes open ${p} --grade spike`, ['lanes', 'open', p, '--grade', 'spike']);
      assert.equal(res.status, 0, res.stderr);
    }

    // 3. Work happens in each lane worktree; lanes mark done.
    for (const p of ['phase-1-auth', 'phase-2-api']) {
      const wt = path.join(container, 'app.lanes', p);
      write(path.join(wt, `${p}.txt`), `${p} implemented\n`);
      git(wt, 'add', '-A');
      git(wt, 'commit', '-q', '--no-verify', '-m', `feat: ${p}`);
      const res = cli(`momentum lanes done ${p}`, ['lanes', 'done', p]);
      assert.equal(res.status, 0, res.stderr);
    }

    const board = cli('momentum lanes', ['lanes']);
    assert.match(board.stdout, /queue: 2 done awaiting landing/);

    // 4. Land sequentially through the queue: first in FIFO lands clean…
    const landA = cli('momentum lanes land phase-1-auth --execute', ['lanes', 'land', 'phase-1-auth', '--execute']);
    assert.equal(landA.status, 0, landA.stderr);
    assert.match(landA.stdout, /landed on 'main'/);

    // …second is now stale (main moved) — refused, rebased, landed.
    const stale = cli('momentum lanes land phase-2-api --execute', ['lanes', 'land', 'phase-2-api', '--execute']);
    assert.equal(stale.status, 1, 'stale lane must be refused');
    assert.match(stale.stdout, /freshness/);
    const wt2 = path.join(container, 'app.lanes', 'phase-2-api');
    const rebase = spawnSync('git', ['rebase', 'main'], { cwd: wt2, encoding: 'utf8' });
    assert.equal(rebase.status, 0, rebase.stderr);
    record('git -C <lane-worktree> rebase main', rebase.stdout || 'Successfully rebased');
    const landB = cli('momentum lanes land phase-2-api --execute', ['lanes', 'land', 'phase-2-api', '--execute']);
    assert.equal(landB.status, 0, landB.stderr);

    assert.ok(fs.existsSync(path.join(dir, 'phase-1-auth.txt')), 'wave-1 work on main');
    assert.ok(fs.existsSync(path.join(dir, 'phase-2-api.txt')), 'wave-1 work on main');

    // 5. Wave-1 phases complete → the next `waves` run unblocks ui.
    const idx = JSON.parse(fs.readFileSync(path.join(dir, 'specs', 'phases', 'index.json'), 'utf8'));
    idx.phases['phase-1-auth'].status = 'complete';
    idx.phases['phase-2-api'].status = 'complete';
    write(path.join(dir, 'specs', 'phases', 'index.json'), JSON.stringify(idx, null, 2));
    const w2 = cli('momentum waves   (after wave-1 landings)', ['waves']);
    assert.equal(w2.status, 0, w2.stderr);
    assert.match(w2.stdout, /wave 1: phase-3-ui/);
    assert.match(w2.stdout, /momentum lanes open phase-3-ui/);

    // Optional evidence capture (one-shot script only — never in npm test).
    if (process.env.MOMENTUM_DEMO_EVIDENCE) {
      const body = [
        '# Three ideas → waves → lanes → sequenced landings (FEAT-028 e2e demo)',
        '> Captured by scripts/capture-three-ideas-demo.sh (tmp paths sanitized).',
        '',
        ...transcript,
      ].join('\n').split(container).join('<tmp>');
      fs.writeFileSync(process.env.MOMENTUM_DEMO_EVIDENCE, body);
    }
  } finally {
    rmrf(container);
  }
});
