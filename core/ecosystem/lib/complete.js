'use strict';

/**
 * Cross-repo completion gate (Phase 31a G3, ADR-0016).
 *
 * The ecosystem-tier mirror of `/complete-phase`'s Rule 12 gate. An initiative
 * may not close until EVERY declared per-member contribution carries real
 * verification evidence, and until the ecosystem's declared integration check
 * passes.
 *
 * WHY THIS EXISTS
 * ---------------
 * Two of the five multi-repo sessions reviewed on 2026-07-26 shipped defects to
 * production that no per-repo gate could have caught, because each repo was
 * individually green: an alembic multiple-heads state created by running
 * `upgrade head` before rather than after a cross-repo conflict merge, and a
 * message-less evidence turn. "Every repo is green" and "the system works" are
 * different claims, and nothing in momentum checked the second one.
 *
 * EVIDENCE GRADING
 * ----------------
 * Deliberately delegated to `core/lanes/lib/land.js`'s `evidenceSection` — the
 * same parser `momentum lanes land` uses — so a contribution cannot pass one
 * gate and fail the other. Grades follow Rule 14's work types:
 *
 *   phase → specs/phases/<ref>/retrospective.md must carry a non-empty
 *           "## Verification Evidence" section
 *   adhoc → specs/adhoc/<ref>/record.md must exist and be non-empty
 *
 * WHAT THIS DOES NOT CLAIM
 * ------------------------
 * It does not verify evidence was produced "in this session" — nothing
 * portable can. It reports each evidence file's last-commit date so a stale
 * retrospective is visible to the human reading the output, and it relies on
 * the integration verify for a genuinely run-now signal. Saying so plainly
 * beats implying a freshness check that does not exist (the BUG-009 lesson).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const lib = require('./index');
const initiativeLib = require('./initiative');
const { evidenceSection } = require('../../lanes/lib/land');

function git(dir, ...args) {
  try {
    const res = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', timeout: 10000 });
    if (res.status !== 0) return null;
    return (res.stdout || '').trim() || null;
  } catch (_e) {
    return null;
  }
}

/** Last commit date (YYYY-MM-DD) touching `relPath`, or null. */
function lastCommitDate(repoDir, relPath) {
  return git(repoDir, 'log', '-1', '--format=%ad', '--date=short', '--', relPath);
}

/**
 * Grade one contribution. Returns { ok, member, kind, ref, detail }.
 *
 * A member with no local checkout BLOCKS rather than passing: an initiative
 * that cannot be verified on this machine is not verified. Silently skipping it
 * would turn a remote member into a hole in the gate.
 */
function checkContribution(ecosystemRoot, manifest, contribution) {
  const { member, kind, ref } = contribution;
  const base = { member, kind, ref };

  const m = (manifest.members || []).find((x) => x.id === member);
  if (!m) {
    return { ...base, ok: false, detail: `member "${member}" is not in ecosystem.json` };
  }

  const loc = lib.resolveMemberLocation(ecosystemRoot, m);
  if (!loc.hasLocal) {
    return {
      ...base,
      ok: false,
      detail: loc.remote
        ? `no local checkout on this machine (remote: ${loc.remote}) — evidence cannot be `
          + 'verified here. Clone it, or complete the initiative from a machine that has it.'
        : 'member path is missing on disk — evidence cannot be verified',
    };
  }

  const repoDir = loc.localPath;

  if (kind === 'adhoc') {
    const rel = path.join('specs', 'adhoc', ref, 'record.md');
    const abs = path.join(repoDir, rel);
    if (!fs.existsSync(abs)) {
      return { ...base, ok: false, detail: `missing ad-hoc record: ${rel} (Rule 14 quick-task evidence)` };
    }
    const body = fs.readFileSync(abs, 'utf8');
    if (!body.trim()) {
      return { ...base, ok: false, detail: `ad-hoc record is empty: ${rel}` };
    }
    const when = lastCommitDate(repoDir, rel);
    return {
      ...base,
      ok: true,
      detail: `ad-hoc record present (${rel}${when ? `, last changed ${when}` : ''})`,
    };
  }

  // phase grade
  const rel = path.join('specs', 'phases', ref, 'retrospective.md');
  const abs = path.join(repoDir, rel);
  if (!fs.existsSync(abs)) {
    return { ...base, ok: false, detail: `missing retrospective: ${rel} (Rule 12 phase evidence)` };
  }
  const section = evidenceSection(fs.readFileSync(abs, 'utf8'));
  if (!section) {
    return {
      ...base,
      ok: false,
      detail: `retrospective exists but "## Verification Evidence" is missing or empty (${rel})`,
    };
  }
  const when = lastCommitDate(repoDir, rel);
  return {
    ...base,
    ok: true,
    detail: `retrospective Verification Evidence present (${section.length} chars`
      + `${when ? `, last changed ${when}` : ''})`,
  };
}

/**
 * Run the declared integration verification.
 * Returns { declared, ok, command, output }.
 *
 * When nothing is declared this returns `{ declared: false, ok: true }` — the
 * CALLER must surface that as an explicit gap. Per ADR-0016 D6 an undeclared
 * integration verify is a stated hole, never a silent pass, and momentum stays
 * forge-neutral by never inventing the command itself.
 */
function runIntegrationVerify(ecosystemRoot, manifest, opts) {
  opts = opts || {};
  const cfg = lib.readEcosystemConfig(manifest);
  const command = cfg.integration_verify_command;
  if (!command) return { declared: false, ok: true, command: null, output: '' };
  if (opts.skip) {
    return { declared: true, ok: false, command, output: '(not run — --skip-verify)', skipped: true };
  }

  const res = spawnSync(command, {
    cwd: ecosystemRoot,
    shell: true,
    encoding: 'utf8',
    timeout: opts.timeout || 600000,
  });
  const output = `${res.stdout || ''}${res.stderr || ''}`.trim();
  return { declared: true, ok: res.status === 0, command, output, status: res.status };
}

/**
 * Full gate evaluation. Returns
 * { ok, contributions: [...], verify: {...}, blockers: [...] }.
 * Pure with respect to the initiative file — writing happens in the caller.
 */
function evaluate(ecosystemRoot, slug, opts) {
  opts = opts || {};
  const manifest = lib.loadManifest(ecosystemRoot);
  const loaded = initiativeLib.loadInitiative(ecosystemRoot, slug);
  if (!loaded) throw new Error(`no initiative "${slug}"`);

  const fm = loaded.frontmatter;
  const raw = Array.isArray(fm.contributions) ? fm.contributions : [];
  const parsed = raw.map((e) => initiativeLib.parseContribution(e)).filter(Boolean);

  const results = parsed.map((c) => checkContribution(ecosystemRoot, manifest, c));
  const blockers = results.filter((r) => !r.ok);

  // An initiative with no declared contributions cannot be evidenced. Closing
  // it would record "verified" for work that was never linked to any record.
  if (parsed.length === 0) {
    blockers.push({
      member: '—', kind: '—', ref: '—',
      ok: false,
      detail: 'no contributions declared — run `momentum ecosystem initiative start '
        + `${slug} --contribute <member>:<kind>:<ref>` + '` first',
    });
  }

  const verify = blockers.length
    ? { declared: undefined, ok: false, command: null, output: '(not run — contributions blocked)', deferred: true }
    : runIntegrationVerify(ecosystemRoot, manifest, opts);

  return {
    ok: blockers.length === 0 && verify.ok,
    initiative: loaded,
    manifest,
    contributions: results,
    blockers,
    verify,
  };
}

module.exports = {
  checkContribution,
  runIntegrationVerify,
  evaluate,
};
