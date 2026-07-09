'use strict';

/**
 * Phase 26 — Project Config, Group 2 (BUG-024 fix).
 *
 * Guards that the GLOBAL recipe templates (core/commands/*.md) never instruct
 * the agent to run forge-specific or registry-specific release commands. The
 * templates stop at the truly universal git primitives (`git tag -a` +
 * `git push origin <tag>`); forge release creation (`gh release create`,
 * `glab release create`, …) and registry publishes (`npm publish --access
 * public`, `twine upload`, …) live in `## Project Extensions` +
 * `specs/config.md` (ADR-0009).
 *
 * Example/illustration mentions (config discovery questions, "NOT in this
 * template" notes, format samples) are permitted — the guard targets the
 * INSTRUCTIONAL code-block context, not prose examples.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');
const COMMANDS = path.join(REPO_ROOT, 'core', 'commands');

function readCmd(name) {
  return fs.readFileSync(path.join(COMMANDS, name), 'utf8');
}

function listCommands() {
  return fs.readdirSync(COMMANDS).filter((f) => f.endsWith('.md'));
}

test('BUG-024: no global command template instructs `npm publish --access public`', () => {
  for (const f of listCommands()) {
    const body = readCmd(f);
    assert.ok(
      !/npm publish --access public/.test(body),
      `${f} instructs "npm publish --access public" — the BUG-023/024 leak. Publish commands belong in ## Project Extensions.`
    );
  }
});

test('BUG-024: complete-phase.md contains no `gh release create` (release code block stops at git tag + push)', () => {
  const body = readCmd('complete-phase.md');
  assert.ok(
    !/gh release create/.test(body),
    'complete-phase.md still runs `gh release create` — forge-specific. Drop it; the template stops at git tag + git push origin <tag>.'
  );
  // the universal git release primitives are present
  assert.match(body, /git tag -a vX\.Y\.Z/);
  assert.match(body, /git push origin vX\.Y\.Z/);
});

test('BUG-024: start-phase.md hard-stop does not name a forge ("GitHub Release") as a gate step', () => {
  const body = readCmd('start-phase.md');
  // The hard-stop asks to merge + tag, NOT to create a GitHub Release.
  const hardStop = body.slice(body.indexOf('### Hard stop'));
  assert.ok(
    !/create the GitHub Release/i.test(hardStop),
    'start-phase.md hard-stop names "GitHub Release" as a gate step — forge-specific (BUG-024).'
  );
  assert.match(hardStop, /tag `v<version>`/i, 'hard-stop asks for a tag (universal git)');
});

test('forge/release commands are pointed to ## Project Extensions + config, not run globally', () => {
  for (const f of ['start-phase.md', 'complete-phase.md']) {
    const body = readCmd(f);
    assert.match(body, /## Project Extensions/, `${f} should point project-specific release/publish to ## Project Extensions`);
    assert.match(body, /specs\/config\.md/, `${f} should reference specs/config.md for release_command/publish_target`);
  }
});
