'use strict';

/**
 * Phase 32b G3 — just-in-time spec derivation (Epic 0001 D10).
 *
 * The operator is never re-interviewed, because DECISIONS ARE DURABLE and live
 * in the epic record. Plans are perishable and are regenerated here, at the
 * moment a phase starts, from the epic plus everything learned since.
 *
 * The rejected alternative was authoring all phases' specs upfront. The
 * operator's own scenario killed it: they asked what happens when, after phase
 * 1, they observe something and want to change a decision. Under upfront
 * authoring that means hunting through already-written specs, editing them, and
 * reconciling against tasks already checked `[x]` — every correction becomes a
 * merge conflict. Under derivation the amendment is simply an input the next
 * phase reads.
 *
 * PURE, and no model call. `(inputs) → {overview, plan, tasks}` as markdown
 * strings. Same inputs must give byte-identical output, so the caller supplies
 * the date rather than this module reading a clock — a derivation that varied
 * run-to-run could not be reviewed, diffed, or trusted.
 *
 * What this produces is a SKELETON, not a finished plan: the epic knows the
 * objective, the decisions, the deps and the completion criteria; it does not
 * know this phase's group breakdown, which depends on code that exists now and
 * did not when the epic was written. The skeleton carries everything derivable
 * and marks what is not.
 */

const DERIVED_BANNER = '> **Derived, not brainstormed.**';

function bulletList(items, empty) {
  if (!items || items.length === 0) return empty;
  return items.map((i) => `- ${i}`).join('\n');
}

/**
 * @param {object} input
 * @param {object} input.epic          parsed epic frontmatter (`data` from epic.load)
 * @param {string} input.epicSlug
 * @param {string} input.phase         phase directory name
 * @param {string[]} [input.deps]      phases this one depends on
 * @param {string[]} [input.decisions] one line per inherited decision
 * @param {object[]} [input.amendments] forward-only amendments since the epic was written
 * @param {string[]} [input.deferred]  items prior phases deferred to this one
 * @param {string} input.date          YYYY-MM-DD — supplied, never read from a clock
 * @returns {{overview: string, plan: string, tasks: string}}
 */
function derive(input) {
  const {
    epic, epicSlug, phase, deps = [], decisions = [],
    amendments = [], deferred = [], date,
  } = input;

  const title = phase.replace(/^phase-/, '').replace(/-/g, ' ');
  const policy = [
    `release: ${epic.policy_release || 'per-phase'}`,
    `push: ${epic.policy_push || 'per-phase'}`,
    `tdd: ${epic.policy_tdd || 'strict'}`,
  ].join(' · ');

  const overview = [
    '---',
    'type: Phase',
    'status: in-progress',
    `epic: ${epicSlug}`,
    'tags: []',
    `deps: [${deps.join(', ')}]`,
    '---',
    '',
    `# ${phase}`,
    '',
    DERIVED_BANNER,
    `> Generated from \`specs/epics/${epic.id}-${epicSlug}.md\` on ${date} with no`,
    '> operator interview (Epic D10). Every decision below was settled when the',
    '> epic was written and is NOT re-litigated here. Decisions are durable;',
    '> plans are perishable — this file is the perishable half.',
    '',
    '## Goal',
    '',
    `_(derive from the epic objective as it applies to ${title} — the epic knows`,
    'what the feature is for; only this phase knows what it contributes.)_',
    '',
    '## Inherited decisions',
    '',
    '> From the epic record. Never re-asked.',
    '',
    bulletList(decisions, '_(none recorded on the epic yet)_'),
    '',
  ];

  if (amendments.length) {
    overview.push(
      '## Operator amendments since the epic was written',
      '',
      '> Forward-only amendments made during the run. These are INPUTS to this',
      '> phase, which is the whole reason specs are derived rather than authored',
      '> upfront — under upfront authoring each of these would be a merge',
      '> conflict against specs already written.',
      '',
      bulletList(amendments.map((a) => `${a.ts.slice(0, 10)} — ${a.text}`), ''),
      ''
    );
  }

  if (deferred.length) {
    overview.push(
      '## Deferred to this phase',
      '',
      bulletList(deferred, ''),
      ''
    );
  }

  overview.push(
    '## Scope',
    '',
    '**In:** _(from the epic\'s phase table)_',
    '',
    '**Out:** _(what the epic assigns to other phases)_',
    '',
    '## Deliverables',
    '',
    '| Deliverable | Verification |',
    '|---|---|',
    '| _(one row per deliverable)_ | `npm test` |',
    '',
    '## Acceptance criteria',
    '',
    '> Checkable. "It works" is not a criterion.',
    '',
    '1. _(…)_',
    '',
    `## Run policy (inherited)\n\n${policy}`,
    ''
  );

  const plan = [
    '---',
    'type: Plan',
    'status: in-progress',
    `epic: ${epicSlug}`,
    '---',
    '',
    `# ${phase} — Plan`,
    '',
    '```',
    '# Execution:  G0 → (G1 ∥ G2) → G3',
    '```',
    '',
    DERIVED_BANNER,
    '> The group breakdown is the one thing the epic CANNOT know — it depends on',
    '> code that exists now and did not when the epic was written. Everything',
    '> above the groups is derived; the groups themselves are authored here.',
    '',
    deps.length
      ? `Depends on: ${deps.join(', ')}. Those must be complete before this starts.`
      : 'No dependencies — this phase can start immediately.',
    '',
    `Run policy: ${policy}`,
    '',
    '---',
    '',
    '## Group 0 — Contracts *(sequential, blocks all)*',
    '',
    '**Commit:** `docs: contracts`',
    '',
    '---',
    '',
    '## Group 1 — _(feature area)_',
    '',
    '**Commit:** `feat: …`',
    '',
    '---',
    '',
    '## Group 2 — Verification *(sequential)*',
    '',
    '**Commit:** `test: …`',
    '',
  ].join('\n');

  const tasks = [
    '---',
    'type: Tasks',
    'status: in-progress',
    `epic: ${epicSlug}`,
    '---',
    '',
    `# ${phase} — Tasks`,
    '',
    '> Mirrors `plan.md`. `[x]` done · `[/]` in-progress · `[ ]` todo.',
    '> Verify before claiming done (Rule 12).',
    epic.policy_tdd === 'strict'
      ? '> **TDD strict:** no task may be marked `[x]` without a recorded red→green.'
      : '',
    '',
    '## Group 0 — Contracts *(blocks)*',
    '- [ ] _(…)_',
    '- [ ] Verify: `npm test`',
    '',
    '## Group 1',
    '- [ ] _(…)_',
    '- [ ] Verify: `npm test`',
    '',
    '## Group 2 — Verification',
    '- [ ] _(…)_',
    '- [ ] Verify: `npm test`',
    '',
  ].filter((l) => l !== '').join('\n');

  return { overview: overview.join('\n'), plan, tasks };
}

module.exports = { derive, DERIVED_BANNER };
