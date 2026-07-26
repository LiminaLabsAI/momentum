'use strict';

/**
 * Phase 31b G5 — ecosystem enforcement, end-to-end (ADR-0017).
 *
 * One scenario walks the whole story and asserts every acceptance criterion:
 *
 *   AC-1  editing a second member with no initiative nudges BEFORE the edit
 *   AC-2  a plain `git commit` surfaces the same banner, no agent involved
 *   AC-3  `ecosystem status` carries phase + P0/P1 + lanes per member
 *   AC-4  the nudge names the target member's open P0/P1
 *   AC-5  `lanes land` REFUSES while an upstream member has not landed
 *   AC-6  the last contribution requires the declared integration verify
 *   AC-7  cross-repo doc sync is delivered to the target's inbox
 *   AC-8  the rules text distinguishes best-effort from enforced
 *
 * The narrative is the one from the 2026-07-26 review, replayed: an agent
 * drifts from backend into frontend, where BUG-001 is already open against the
 * very formatter it is about to rewrite.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const { mktmp, rmrf, runCli, write } = require('./_helpers');
const crossRepo = require('../core/ecosystem/lib/cross-repo');
const landing = require('../core/ecosystem/lib/landing');
const orient = require('../core/ecosystem/lib/orient');

const REPO_ROOT = path.resolve(__dirname, '..');
const GATE = path.join(REPO_ROOT, 'core', 'scripts', 'cross-repo-gate.sh');

const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@x',
  GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@x',
};
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', env: ENV }).trim();

const FRONTEND_BACKLOG = `| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| BUG-001 | Cost formatter shows "Not specified" for sub-cent values | P1 | open | phase-4 | d |
`;

test('ecosystem enforcement: drift is caught, order is enforced, sync is delivered', async () => {
  const tmp = mktmp('eco-enforce-');
  try {
    // ── an ecosystem with two real momentum members ───────────────────────
    assert.equal(runCli(['ecosystem', 'init', 'eco'], { cwd: tmp }).status, 0);
    const root = path.join(tmp, 'eco');

    const dirs = {};
    for (const [id, role] of [['backend', 'platform'], ['frontend', 'client']]) {
      const dir = path.join(tmp, id);
      fs.mkdirSync(dir, { recursive: true });
      git(dir, 'init', '-q');
      git(dir, 'config', 'user.email', 't@x');
      git(dir, 'config', 'user.name', 'T');
      assert.equal(runCli(['init', '.', '--agent', 'claude-code'], { cwd: dir }).status, 0);
      assert.equal(
        runCli(['ecosystem', 'add', `../${id}`, '--role', role, '--id', id], { cwd: root }).status,
        0,
      );
      dirs[id] = dir;
    }
    // frontend already tracks the bug the agent is about to walk into.
    write(path.join(dirs.frontend, 'specs', 'backlog', 'backlog.md'), FRONTEND_BACKLOG);
    git(dirs.frontend, 'add', '-A');
    git(dirs.frontend, 'commit', '-qm', 'chore: seed backlog');

    // ── AC-3: the fleet view carries each member's real state ─────────────
    const status = runCli(['ecosystem', 'status', '--no-git'], { cwd: root });
    assert.equal(status.status, 0, status.stderr);
    assert.match(status.stdout, /P1: BUG-001/, 'AC-3: open P0/P1 surface per member');

    // ── work begins in backend ────────────────────────────────────────────
    write(path.join(dirs.backend, 'api.js'), 'module.exports = {};\n');
    git(dirs.backend, 'add', 'api.js');
    git(dirs.backend, 'commit', '-qm', 'feat: attachment endpoint');

    // ── AC-1 + AC-4: drifting into frontend nudges BEFORE the edit ────────
    const nudge = spawnSync('bash', [GATE], {
      input: JSON.stringify({
        session_id: 'sess-e2e',
        tool_name: 'Write',
        tool_input: { file_path: path.join(dirs.frontend, 'src', 'cost.js') },
      }),
      encoding: 'utf8', timeout: 15000,
    });
    assert.equal(nudge.status, 0, 'AC-1: the nudge is advice — never a block');
    assert.match(nudge.stderr, /Cross-repo work with no initiative: backend \+ frontend/);
    assert.match(nudge.stderr, /BUG-001/,
      'AC-4: it must name the bug already open against the code being touched');
    assert.match(nudge.stderr, /\/brainstorm-initiative/);

    // ── AC-2: and the git-native layer says the same, with no agent ───────
    write(path.join(dirs.frontend, 'src.js'), 'x\n');
    git(dirs.frontend, 'add', 'src.js');
    const commit = spawnSync('git', ['commit', '-m', 'feat: render attachments'],
      { cwd: dirs.frontend, encoding: 'utf8', env: ENV });
    assert.equal(commit.status, 0, 'AC-2: the banner must never block a commit');
    assert.match(commit.stderr, /Cross-repo work with no initiative/,
      'AC-2: fires for a plain git commit — humans and scripts included');

    // ── the agent complies: an initiative now covers the work ─────────────
    assert.equal(runCli(['ecosystem', 'initiative', 'create', 'attachments',
      '--why', 'Users need attachments', '--repos', 'backend,frontend',
      '--owner', 'ada'], { cwd: root }).status, 0);
    assert.equal(runCli(['ecosystem', 'initiative', 'start', 'attachments',
      '--contribute', 'backend:phase:phase-12-attachments',
      '--contribute', 'frontend:adhoc:fix-BUG-031',
      '--edge', 'frontend:backend:api-contract'], { cwd: root }).status, 0);

    // …and the nudge goes quiet, because the work is now covered.
    const quiet = spawnSync('bash', [GATE], {
      input: JSON.stringify({
        session_id: 'sess-after',
        tool_name: 'Write',
        tool_input: { file_path: path.join(dirs.frontend, 'src', 'cost.js') },
      }),
      encoding: 'utf8', timeout: 15000,
    });
    assert.equal(quiet.stderr.trim(), '', 'covered work must not be nudged');

    // ── AC-5: frontend cannot land before its upstream backend ────────────
    const blocked = landing.landingCheck(dirs.frontend, { ecosystemRoot: root });
    assert.equal(blocked.applicable, true);
    assert.equal(blocked.ok, false, 'AC-5: out-of-order landing must be refused');
    assert.equal(blocked.blockers[0].member, 'backend');
    const why = landing.checkLines(blocked).join('\n');
    assert.match(why, /'backend' has not landed/);
    assert.match(why, /api-contract edge/, 'the reason must name the edge');

    // ── backend lands first; frontend unblocks and becomes the LAST ───────
    landing.recordLand(dirs.backend, 'attachments', { summary: 'landed backend' });

    const unblocked = landing.landingCheck(dirs.frontend, { ecosystemRoot: root });
    assert.equal(unblocked.ok, true, 'in-order landing proceeds');
    assert.equal(unblocked.isLast, true);

    // ── AC-6: the last contribution carries the integration verify ────────
    const mp = path.join(root, 'ecosystem.json');
    const manifest = JSON.parse(fs.readFileSync(mp, 'utf8'));
    manifest.config = { integration_verify_command: 'exit 3' };
    fs.writeFileSync(mp, JSON.stringify(manifest, null, 2) + '\n');

    const completeLib = require('../core/ecosystem/lib/complete');
    const failing = completeLib.runIntegrationVerify(root, manifest);
    assert.equal(failing.declared, true);
    assert.equal(failing.ok, false,
      'AC-6: a failing cross-repo check must block the final landing');

    manifest.config = { integration_verify_command: 'echo contracts agree' };
    fs.writeFileSync(mp, JSON.stringify(manifest, null, 2) + '\n');
    assert.equal(completeLib.runIntegrationVerify(root, manifest).ok, true);

    // ── AC-7: cross-repo doc sync is DELIVERED, not just mentioned ────────
    const orchestration = require('../core/orchestration');
    // NOTE: awaited, not returned. A sync `finally { rmrf(tmp) }` fires the
    // moment the try block RETURNS a promise, deleting the fixture before the
    // assertions run — which is exactly what happened the first time.
    await orchestration.handoff.handoff({
      fromRepo: dirs.backend,
      toRepo: dirs.frontend,
      summary: 'Doc sync: attachments vocabulary affects your glossary',
      decisions: ['ADR-0007 introduces the term "attachment blob"'],
      filesTouched: ['specs/vision/glossary.md'],
      verificationCommands: [],
      openQuestions: ['Does this still apply after your latest changes?'],
      ecosystem: { rootPath: root, memberId: 'backend' },
      silent: true,
    });
    {
      const inbox = path.join(dirs.frontend, '.momentum', 'inbox');
      const pending = fs.existsSync(inbox)
        ? fs.readdirSync(inbox).filter((f) => f.startsWith('handoff-'))
        : [];
      assert.ok(pending.length >= 1,
        'AC-7: the entry must land in the target inbox, not just in chat');
      const body = fs.readFileSync(path.join(inbox, pending[0]), 'utf8');
      assert.match(body, /attachments vocabulary/);

      // frontend's own specs must remain untouched — delivery is not ownership.
      assert.ok(!fs.existsSync(path.join(dirs.frontend, 'specs', 'vision', 'glossary.md')),
        'sync must never write into another repo\'s specs/');

      // ── AC-8: the rules state strength precisely ────────────────────────
      const tpl = fs.readFileSync(
        path.join(REPO_ROOT, 'core/ecosystem/templates/ecosystem-claude.md'), 'utf8');
      assert.match(tpl, /best-effort/i);
      assert.match(tpl, /unconditional/i);
      assert.match(tpl, /enforced/i);
      assert.doesNotMatch(tpl, /this routing is agent convention/i);

      // Fleet orient still reports frontend's open bug throughout.
      const [, fe] = orient.orientFleet(root);
      assert.ok(fe.blockers.some((b) => b.id === 'BUG-001'));
      assert.equal(crossRepo.detect(root).shouldRoute, false,
        'with an initiative open, the ecosystem is quiet again');
    }
  } finally {
    rmrf(tmp);
  }
});
