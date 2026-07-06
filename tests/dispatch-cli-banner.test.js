'use strict';

/**
 * ENH-034 — `momentum dispatch` CLI surfaces the in-process
 * degraded-mode notice UPFRONT so it is the literal first user-visible
 * output line.
 *
 * Before: the "CLI = keyword summaries only" caveat was a trailing
 * parenthetical at the END of the synthesis block, where users had
 * already concluded the per-repo summaries were the answer.
 *
 * After:
 *   - emitted as a `note` event BEFORE the `started` event (visible
 *     first in CLI stdout via the default renderer);
 *   - rendered as a `> [!NOTE]` admonition at the TOP of the synthesis
 *     body (so anyone reading the synthesis sees the caveat first);
 *   - rendered as a `> [!NOTE]` admonition immediately below the
 *     `**Mode:**` header in dispatch-NNN.md artifact;
 *   - skipped on agent-driven `record()` runs (those carry real LLM
 *     synthesis — the caveat would mislead).
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');
const dispatchLib = require('../core/orchestration/dispatch');
const eventsLib = require('../core/orchestration/events');

function mkEco(tmp) {
  const eco = path.join(tmp, 'eco');
  fs.mkdirSync(eco, { recursive: true });
  fs.writeFileSync(
    path.join(eco, 'ecosystem.json'),
    JSON.stringify({
      name: 'eco',
      version: 1,
      members: [
        { id: 'a', path: 'a', role: 'other' },
        { id: 'b', path: 'b', role: 'other' },
      ],
    }, null, 2),
  );
  for (const name of ['a', 'b']) {
    const repo = path.join(eco, name);
    fs.mkdirSync(path.join(repo, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'specs', 'status.md'), `# ${name}\n`);
    fs.writeFileSync(path.join(repo, 'README.md'), `# ${name}\n`);
  }
  return eco;
}

test('CLI_MODE_NOTICE is exported and contains the load-bearing phrase', () => {
  assert.equal(typeof dispatchLib.CLI_MODE_NOTICE, 'string');
  assert.match(dispatchLib.CLI_MODE_NOTICE, /MODE NOTICE/);
  assert.match(dispatchLib.CLI_MODE_NOTICE, /keyword summaries only/);
  assert.match(dispatchLib.CLI_MODE_NOTICE, /\/dispatch.*slash command/);
});

test('dispatch() emits MODE NOTICE as a `note` event BEFORE `started`', async () => {
  const tmp = mktmp();
  try {
    const eco = mkEco(tmp);
    // Capture events with a custom emitter
    const seen = [];
    const emitter = eventsLib.createEmitter({ primitive: 'dispatch' });
    emitter.on((e) => seen.push(e));
    await dispatchLib.dispatch({
      repos: [path.join(eco, 'a'), path.join(eco, 'b')],
      userIntent: 'check x',
      originatingRepo: path.join(eco, 'a'),
      emitter,
      silent: true,
    });

    const noteIdx = seen.findIndex(
      (e) => e.kind === 'note' && /MODE NOTICE/.test(e.message || ''),
    );
    const startedIdx = seen.findIndex((e) => e.kind === 'started');

    assert.ok(noteIdx >= 0, 'MODE NOTICE `note` event must be emitted');
    assert.ok(startedIdx >= 0, '`started` event must be emitted');
    assert.ok(
      noteIdx < startedIdx,
      `MODE NOTICE (#${noteIdx}) must precede started (#${startedIdx})`,
    );
  } finally {
    rmrf(tmp);
  }
});

test('momentum dispatch CLI surfaces MODE NOTICE in stdout', () => {
  const tmp = mktmp('dispatch-banner-cli-');
  try {
    const eco = mkEco(tmp);
    const r = runCli(
      ['dispatch', 'a', 'b', '--prompt', 'audit X'],
      { cwd: path.join(eco, 'a') },
    );
    assert.equal(r.status, 0, `cli failed: ${r.stderr}`);
    assert.match(r.stdout, /MODE NOTICE/, 'stdout must contain MODE NOTICE');
    assert.match(r.stdout, /keyword summaries only/);
    // And the notice should appear early — before the synthesis output
    // (synthesis starts at "Dispatch across N repo(s)").
    const noticeIdx = r.stdout.indexOf('MODE NOTICE');
    const synthIdx = r.stdout.indexOf('Dispatch across');
    assert.ok(
      noticeIdx >= 0 && synthIdx > noticeIdx,
      'MODE NOTICE must appear before the synthesis body',
    );
  } finally {
    rmrf(tmp);
  }
});

test('in-process synthesis carries the admonition at the TOP, not the bottom', () => {
  const synthesis = dispatchLib.synthesizeInProcess({
    userIntent: 'check x',
    perRepoResults: [
      { repo: '/tmp/a', summary: 'a says x', duration: 10 },
      { repo: '/tmp/b', summary: 'b says x', duration: 20 },
    ],
    failures: [],
  });
  // Admonition at the top
  assert.match(synthesis, /^> \[!NOTE\]/);
  assert.match(synthesis, /MODE: CLI \/ in-process/);
  // Old trailing parenthetical removed
  assert.doesNotMatch(synthesis, /\(In-process synthesis — no LLM available/);
  // Per-repo summaries still present
  assert.match(synthesis, /Per-repo summaries/);
  assert.match(synthesis, /a says x/);
});

test('dispatch artifact carries the admonition under the Mode header (in-process)', () => {
  const tmp = mktmp('dispatch-banner-artifact-');
  try {
    const eco = mkEco(tmp);
    const r = runCli(
      ['dispatch', 'a', 'b', '--prompt', 'check'],
      { cwd: path.join(eco, 'a') },
    );
    assert.equal(r.status, 0);
    const runsDir = path.join(eco, 'a', '.momentum', 'runs');
    const files = fs.readdirSync(runsDir).filter((f) => f.startsWith('dispatch-'));
    assert.equal(files.length, 1);
    const body = fs.readFileSync(path.join(runsDir, files[0]), 'utf8');

    // Admonition between **Mode:** and ## Synthesis
    const modeIdx = body.indexOf('**Mode:**');
    const synthIdx = body.indexOf('## Synthesis');
    const noteIdx = body.indexOf('> [!NOTE]');
    assert.ok(modeIdx >= 0 && synthIdx > modeIdx);
    assert.ok(
      noteIdx > modeIdx && noteIdx < synthIdx,
      'NOTE admonition must sit between **Mode:** and ## Synthesis',
    );
    assert.match(body, /CLI \/ in-process mode — keyword summaries only/);
  } finally {
    rmrf(tmp);
  }
});

test('agent-driven record() artifact SKIPS the CLI-mode admonition', () => {
  const tmp = mktmp('dispatch-banner-record-');
  try {
    const eco = mkEco(tmp);
    const originating = path.join(eco, 'a');
    const ecosystem = { rootPath: eco, memberId: 'a' };
    const result = dispatchLib.record({
      repos: [path.join(eco, 'a'), path.join(eco, 'b')],
      userIntent: 'agent-driven test',
      perRepoResults: [
        { repo: path.join(eco, 'a'), summary: 'agent summary a', findings: [] },
        { repo: path.join(eco, 'b'), summary: 'agent summary b', findings: [] },
      ],
      failures: [],
      synthesis: 'This is a true LLM synthesis from the agent.',
      originatingRepo: originating,
      ecosystem,
      duration: 1234,
    });
    const body = fs.readFileSync(result.runArtifactPath, 'utf8');
    // No CLI admonition
    assert.doesNotMatch(body, /CLI \/ in-process mode — keyword summaries only/);
    // The agent's synthesis is included verbatim
    assert.match(body, /This is a true LLM synthesis/);
  } finally {
    rmrf(tmp);
  }
});
