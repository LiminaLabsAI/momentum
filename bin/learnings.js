'use strict';

/**
 * `momentum learnings` — what this project's own history already knows.
 *
 * Phase 34 G2. momentum writes 339 history entries, 46 retrospectives, 148
 * backlog rows and 21 ADRs, and until now nothing read any of it back. The cost
 * was concrete: a defect class reached its SIXTH instance before anyone named
 * it, even though individual entries said "Nth instance of this shape" in prose.
 * Nobody was counting.
 *
 * **Report-only by default, and proposals are never accepted automatically.**
 * Same posture as `selfcheck`, for a sharper reason: this output is an
 * inference, not a measurement. A tool that acts on its own inference is one
 * nobody trusts twice — and its natural home is Rule 4's pre-phase check, the
 * surface an agent uses to decide whether the backlog is worth believing.
 * Degrading that would cost more than this whole subsystem adds.
 */

const fs = require('fs');
const path = require('path');

const MOMENTUM_ROOT = path.resolve(__dirname, '..');
const corpusLib = require(path.join(MOMENTUM_ROOT, 'core', 'learnings', 'lib', 'corpus'));
const patterns = require(path.join(MOMENTUM_ROOT, 'core', 'learnings', 'lib', 'patterns'));

/** A class this big is worth a human deciding about. */
const PROPOSAL_THRESHOLD = 5;

const USAGE = `momentum learnings — recurring patterns in this project's own history

Usage:
  momentum learnings [--json] [--propose] [--root <dir>]

  --json      machine shape
  --propose   write a DRAFT ADR for classes at or above the threshold, into
              specs/decisions/proposed/. Never into specs/decisions/.

Reporting is the default. Nothing is ever applied without --propose, and even
then a proposal is a draft for a human to accept or delete.
`;

function flag(args, name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

/** Draft an ADR for a class. Returns the path written. */
function writeProposal(root, cls, dateIso) {
  const dir = path.join(root, 'specs', 'decisions', 'proposed');
  fs.mkdirSync(dir, { recursive: true });
  const slug = `${cls.name}-${cls.members.length}-members`;
  const file = path.join(dir, `${slug}.md`);
  const body = `---
type: ADR
status: PROPOSED — not accepted, not numbered
generated: ${dateIso}
---

# Proposed: \`${cls.name}\` has recurred ${cls.members.length} times

**This is a draft written by \`momentum learnings --propose\`. It is not an
accepted decision.** Accept it by moving it into \`specs/decisions/\` with a
real number and a real rationale, or delete it. Nothing else reads this file.

## The evidence

Members: ${cls.members.map((m) => `\`${m}\``).join(', ')}

Declared by:

${cls.evidence.map((e) => `- ${e}`).join('\n')}

## Why a human decides this

The detector can count recurrences. It cannot tell you whether the class is
real, whether the members share a cause or only a vocabulary, or what to do
about it. Those are the parts worth an ADR, and they are exactly the parts
this file cannot supply.
`;
  fs.writeFileSync(file, body);
  return path.relative(root, file);
}

function runLearnings(args) {
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(USAGE);
    return 0;
  }

  const root = path.resolve(flag(args, '--root', process.cwd()));
  const corpus = corpusLib.fromRepo(root);
  const result = patterns.detect(corpus);

  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ ...result, threshold: PROPOSAL_THRESHOLD }, null, 2)}\n`);
    return 0;
  }

  console.log(`▸ learnings — ${corpus.rows.length} backlog rows, ${corpus.prose.length} documents`);

  if (!result.classes.length) {
    console.log('  no recurring patterns found');
    return 0;
  }

  for (const cls of result.classes) {
    console.log('');
    console.log(`  ${cls.name} — ${cls.members.length} members`);
    console.log(`    ${cls.members.join(', ')}`);
    for (const e of cls.evidence.slice(0, 3)) console.log(`    · ${e}`);
  }

  const big = result.classes.filter((c) => c.members.length >= PROPOSAL_THRESHOLD);
  if (big.length && !args.includes('--propose')) {
    console.log('');
    console.log(`  ${big.length} class(es) at or above ${PROPOSAL_THRESHOLD} members.`);
    console.log('  Draft an ADR for a human to accept:  momentum learnings --propose');
  }

  if (args.includes('--propose')) {
    const date = new Date().toISOString().slice(0, 10);
    console.log('');
    for (const cls of big) {
      console.log(`  ✓ drafted ${writeProposal(root, cls, date)}`);
    }
    if (big.length) {
      console.log('');
      console.log('  These are PROPOSALS. Accept one by moving it into specs/decisions/');
      console.log('  with a real number, or delete it. Nothing applies them for you.');
    }
  }

  return 0;
}

module.exports = { runLearnings, writeProposal, PROPOSAL_THRESHOLD, USAGE };
