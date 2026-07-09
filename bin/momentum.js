#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Phase 19 — single source of truth for git-hook install constants.
const { CONTRACT: LIFECYCLE } = require(path.join(__dirname, '..', 'core', 'git-hooks', 'contract'));

// ── Version ───────────────────────────────────────────────────────────────────

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function copyFile(src, dest) {
  recordManaged(dest);
  if (_dryRun) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir, opts = {}) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.name.startsWith('._') || entry.name === '.DS_Store') continue;
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    const rel = path.relative(srcDir, src);
    if (opts.skipRelPaths && opts.skipRelPaths.has(rel)) continue;
    if (entry.isDirectory()) {
      copyDir(src, dest, opts);
      continue;
    }
    // Leaf file. Record it in the managed set (for the lock file + orphan
    // cleanup) whether it is written, identical, or skip-existing — its
    // presence in momentum's managed set is what matters, not whether this
    // run rewrote it. Install-once/user-owned trees opt out via record:false.
    if (opts.record !== false) recordManaged(dest);
    const destRel = path.relative(opts.root || process.cwd(), dest);
    if (opts.upgradeMode) {
      if (fileExists(dest)) {
        const srcContent = fs.readFileSync(src, 'utf8');
        const destContent = fs.readFileSync(dest, 'utf8');
        if (srcContent !== destContent) {
          if (_dryRun) {
            console.log(`  ✋ would upgrade: ${destRel}`);
          } else {
            fs.copyFileSync(dest, dest + '.bak');
            fs.copyFileSync(src, dest);
            console.log(`  ↑ upgraded: ${destRel} (original saved as .bak)`);
          }
        }
        // identical — silent skip
      } else if (_dryRun) {
        console.log(`  ✋ would add:     ${destRel}`);
      } else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        console.log(`  + added:    ${destRel}`);
      }
    } else {
      if (opts.skipIfExists && fileExists(dest)) {
        console.log(`  ⚠️  ${dest} already exists — skipping.`);
      } else {
        // BUG-008: on init, momentum-owned files must not be silently
        // clobbered. With `backup`, an existing file that differs is saved as
        // .bak before overwrite — making re-init idempotent and safe. Fresh
        // adds stay quiet.
        if (opts.backup && fileExists(dest)) {
          const srcBuf = fs.readFileSync(src);
          const destBuf = fs.readFileSync(dest);
          if (!srcBuf.equals(destBuf)) {
            if (_dryRun) {
              console.log(`  ✋ would update: ${destRel}`);
            } else {
              fs.copyFileSync(dest, dest + '.bak');
              console.log(`  ↑ updated:  ${destRel} (original saved as .bak)`);
            }
          }
        }
        if (!_dryRun) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(src, dest);
        }
      }
    }
  }
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

// BUG-006 — substitute <Project Name> placeholder in primary-instruction
// templates (CLAUDE.md / AGENTS.md) with the real project name on init+upgrade.
function getProjectName(targetDir) {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8')
    );
    if (pkg.name && typeof pkg.name === 'string') {
      const scoped = pkg.name.match(/^@[^/]+\/(.+)$/);
      return scoped ? scoped[1] : pkg.name;
    }
  } catch {
    // No package.json (or unreadable / unparseable) — fall through to dirname.
  }
  return path.basename(path.resolve(targetDir)) || 'project';
}

function renderProjectName(content, projectName) {
  return content.replaceAll('<Project Name>', projectName);
}

// ── Installed-files lock file (Phase 20 — Upgrade Hardening) ──────────────────
//
// `.momentum/installed.json` is momentum's per-repo version-of-record, modelled
// on Copier's `_commit` / Cruft's `.cruft.json`. It records the momentum
// version that last wrote the repo, the adapter, and the exact set of
// tool-managed files (with sha256). It is COMMITTED to the repo (D1) so the
// version travels and survives fresh clones.
//
// The managed-file set powers three things: per-repo version reporting, the
// ecosystem sweep's agent detection, and orphan cleanup on upgrade
// (`old.managedFiles − new.managedFiles` = files a newer momentum dropped).
// We only ever delete files we previously installed — user files are never in
// the set, so they are never touched.
//
// Collection: a module-level Set is active only during init()/upgrade(). The
// plain-copy helpers (copyFile/copyDir) and the marker writers append the
// destination they manage. The specs/ skeleton is install-once and user-owned,
// so it opts out via `record: false`.

const MANIFEST_REL = ['.momentum', 'installed.json'];
const MANIFEST_SCHEMA = 1;

let _managedCollector = null;

// When true, init()/upgrade() compute and print the planned action set but
// perform NO filesystem writes (ENH-040). Every fs-mutation in the install
// path is gated on this; post-copy chmod/readdir loops are skipped too (they
// would crash on a dry run because nothing was written).
let _dryRun = false;

function recordManaged(destPath) {
  if (_managedCollector) _managedCollector.add(path.resolve(destPath));
}

function sha256File(filePath) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * Phase 22c (ADR-0007): Load installed state with one-time legacy migration.
 *
 * Legacy format (pre-Phase-22c):
 *   { agent, version, files|managedFiles, schema?, momentumVersion?, installedAt?, updatedAt? }
 *
 * New format (Phase-22c+):
 *   { version, agents: { [name]: { version, files: string[] } } }
 *   — files is an array of relative path strings (simpler than old {path,sha256} objects)
 *   — top-level version = max of all agent versions (backward compat)
 *
 * Migration: detects legacy format by presence of 'agent' at root and absence of 'agents',
 * converts in-place immediately, returns the migrated state. Idempotent: the migrated
 * file has 'agents', so repeat calls pass through without re-migrating.
 * Returns default state ({ version: null, agents: {} }) when no manifest exists.
 */
function loadInstalledState(targetDir) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(targetDir, ...MANIFEST_REL), 'utf8'));

    // Already new format
    if (raw.agents && typeof raw.agents === 'object') {
      return { version: raw.version || '0.0.0', agents: raw.agents };
    }

    // Legacy format detection: has 'agent' at root but no 'agents'
    if ('agent' in raw) {
      const version = raw.version || raw.momentumVersion || '0.0.0';
      const rawFiles = raw.files || raw.managedFiles || [];
      const files = Array.isArray(rawFiles)
        ? rawFiles.map((f) => (typeof f === 'string' ? f : f.path || ''))
            .filter(Boolean)
            .sort()
        : [];

      const migrated = {
        version,
        agents: {
          [raw.agent]: { version, files },
        },
      };

      saveInstalledState(targetDir, migrated);
      return migrated;
    }

    // Unknown format — return default
    return { version: null, agents: {} };
  } catch {
    // Absent or unreadable
    return { version: null, agents: {} };
  }
}

function saveInstalledState(targetDir, state) {
  const dest = path.join(targetDir, ...MANIFEST_REL);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  // Compat mirror (ADR-0007 review fix): external readers — including
  // bin/ecosystem.js's fleet version lock (readMemberVersion) and any
  // OLDER momentum CLI inspecting a newer project — read `momentumVersion`.
  // Keep it in sync with the new top-level `version` so mixed-version
  // fleets never see 'unknown' after migration.
  const out = { version: state.version, momentumVersion: state.version, agents: state.agents };
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
}

function readInstalledManifest(targetDir) {
  // Backward compat wrapper: returns old format for callers that need prevManagedFiles.
  // Only used by upgrade() for orphan cleanup — returns the CURRENT agent's prior entry.
  // Phase 22c: replaced by loadInstalledState() for new code paths.
  try {
    return JSON.parse(fs.readFileSync(path.join(targetDir, ...MANIFEST_REL), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Phase 22c (ADR-0007): Serialize the managed-file set into `.momentum/installed.json`.
 * Uses the per-agent `agents` map format — only updates the specified agent's entry,
 * preserving all other agents. `files` is the collector Set of absolute paths.
 * In dry-run mode the manifest is computed and returned but not written.
 */
function writeInstalledManifest(targetDir, { version, agent, files, dryRun }) {
  const state = loadInstalledState(targetDir); // handles legacy migration
  const managedFiles = [...files]
    .filter((abs) => fileExists(abs))
    .map((abs) =>
      path.relative(targetDir, abs).split(path.sep).join('/')
    )
    .sort();

  state.agents[agent] = { version, files: managedFiles };

  // Top-level version = max of all agent versions (backward compat)
  state.version = Object.values(state.agents)
    .map((a) => a.version)
    .reduce((max, v) => (!max || isNewerVersion(v, max) ? v : max), null) || version;

  if (!dryRun) saveInstalledState(targetDir, state);
  return state;
}

/**
 * Remove orphans: files a previous momentum version installed but the current
 * one no longer ships (`prev.managedFiles − currentSet`). This is the piece a
 * copy-only upgrade can never do (Cruft #67). Safety: we only ever consider
 * files that WE previously recorded as managed — user files are never in the
 * manifest, so they are never eligible. Each removal is backed up to `.bak`.
 * Returns the list of removed relative paths.
 */
/**
 * Additively refresh the target's `.gitignore` with any momentum/OS ignore
 * rules it's missing (Phase 20 follow-up). NEVER removes a user's lines — it
 * only appends rules from `core/specs-templates/.gitignore` that aren't already
 * present, under a marker comment, with a `.bak` backup. Fixes the gap where
 * `upgrade` left an old `.gitignore` untouched, so repos predating the `._*` /
 * `.momentum/*` rules stayed polluted (which on a non-Unix filesystem like
 * exFAT makes git effectively unusable). One designed exception (BUG-014): a
 * bare directory-level `.momentum/` rule is commented out in place, because
 * it defeats the `!.momentum/installed.json` negation — the line's content is
 * preserved, just disabled. `.gitignore` is user-owned, so it is
 * deliberately NOT recorded as a managed file (never orphan-cleaned).
 * Returns 'added' | 'updated' | 'unchanged'.
 */
function refreshGitignore(srcRoot, targetDir) {
  const templatePath = path.join(srcRoot, 'core', 'specs-templates', '.gitignore');
  const targetPath = path.join(targetDir, '.gitignore');
  if (!fileExists(templatePath)) return 'unchanged';

  if (!fileExists(targetPath)) {
    if (_dryRun) {
      console.log('  ✋ would add:     .gitignore');
      return 'added';
    }
    fs.writeFileSync(targetPath, fs.readFileSync(templatePath, 'utf8'));
    console.log('  + added:    .gitignore');
    return 'added';
  }

  // Append only the rule lines (ignore comments/blanks) the target lacks.
  const wantedRules = fs
    .readFileSync(templatePath, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  const targetContent = fs.readFileSync(targetPath, 'utf8');
  const have = new Set(targetContent.split('\n').map((l) => l.trim()));
  const missing = wantedRules.filter((r) => !have.has(r));

  // BUG-014 — a bare directory-level `.momentum/` rule (every pre-Phase-20
  // install has one) defeats the appended `!.momentum/installed.json`: git
  // cannot re-include a file under an ignored DIRECTORY, so the lock file
  // stays silently ignored while upgrade reports success. Neutralize it by
  // commenting it out in place — the designed exception to "never remove a
  // user's lines" (the line's content is preserved, just disabled). Matches
  // ONLY lines that are exactly `.momentum/` or `/.momentum/` modulo
  // whitespace; `.momentum/*`, negations, comments, and unrelated lines are
  // untouched. Runs even when nothing is missing (the pair may already exist
  // from a prior upgrade with the legacy rule still winning above it).
  const isLegacyDirRule = (l) => {
    const t = l.trim();
    return t === '.momentum/' || t === '/.momentum/';
  };
  const legacyCount = targetContent.split('\n').filter(isLegacyDirRule).length;
  if (missing.length === 0 && legacyCount === 0) return 'unchanged';

  if (_dryRun) {
    if (legacyCount > 0) {
      console.log(`  ✋ would comment out ${legacyCount} legacy .momentum/ dir rule(s) in .gitignore (BUG-014)`);
    }
    if (missing.length > 0) {
      console.log(`  ✋ would append ${missing.length} rule(s) to .gitignore`);
    }
    return 'updated';
  }
  fs.copyFileSync(targetPath, targetPath + '.bak');
  let next = legacyCount === 0 ? targetContent : targetContent
    .split('\n')
    .map((l) => isLegacyDirRule(l)
      ? `# ${l.trim()}   (disabled by momentum upgrade — directory rule defeats !.momentum/installed.json, BUG-014)`
      : l)
    .join('\n');
  if (missing.length > 0) {
    const addition =
      '\n# Added by momentum upgrade — keep momentum + OS noise out of git\n' +
      missing.join('\n') + '\n';
    next = next.replace(/\s*$/, '\n') + addition;
  }
  fs.writeFileSync(targetPath, next);
  const did = [];
  if (legacyCount > 0) did.push(`commented out ${legacyCount} legacy .momentum/ dir rule(s)`);
  if (missing.length > 0) did.push(`appended ${missing.length} missing rule(s)`);
  console.log(`  ↑ updated:  .gitignore (${did.join('; ')}; original saved as .bak)`);
  return 'updated';
}

/**
 * Migrate the retired `.agent/rules/project.md` (Phase 23 / ADR-0004).
 * Pristine — content sha256 matches a shipped historical revision (see
 * core/instructions/legacy-project-md-hashes.json) — is removed (the rules
 * now ride the primary instruction file). Anything else is user-customized:
 * kept in place with a deprecation warning, and shielded from orphan
 * cleanup by the caller. Manifest-independent, so pre-Phase-20 installs
 * (no lock file) migrate too.
 * Returns 'absent' | 'removed' | 'would-remove' | 'kept-customized'.
 */
function migrateAgentRules(srcRoot, target, dests) {
  const relParts = [...(dests['agent-rules'] || ['.agent', 'rules']), 'project.md'];
  const rel = relParts.join('/');
  const abs = path.join(target, ...relParts);
  if (!fileExists(abs)) return 'absent';

  const crypto = require('crypto');
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(srcRoot, 'core', 'instructions', 'legacy-project-md-hashes.json'),
      'utf8'
    )
  );
  // Trailing-whitespace-normalized: an editor-added extra final newline is
  // not "customization" (proved by the self-repo dogfood). Every shipped
  // revision ends with exactly one \n, so the manifest hashes are already
  // in normalized form.
  const normalized = fs.readFileSync(abs, 'utf8').replace(/\s+$/, '') + '\n';
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');

  if (manifest.sha256.includes(hash)) {
    if (_dryRun) {
      console.log(`  ✋ would remove: ${rel} (pristine — rules now live in the primary instruction file)`);
      return 'would-remove';
    }
    fs.rmSync(abs);
    try { fs.rmdirSync(path.dirname(abs)); } catch { /* dir not empty — fine */ }
    console.log(`  🗑  removed: ${rel} (pristine — rules now live in the primary instruction file)`);
    return 'removed';
  }

  console.log(`  ⚠️  kept: ${rel} — customized content detected. This file is retired (ADR-0004);`);
  console.log(`     no agent auto-loads it. Move your customizations into the '## Project Extensions'`);
  console.log(`     section of the primary instruction file, then delete it.`);
  return 'kept-customized';
}

/**
 * Foundation docs are authored, not scaffolded (Phase 25 / ADR-0008).
 * Legacy installs (≤ v0.31.2) shipped four placeholder foundation docs
 * (vision/charter/principles/success-criteria + planning/roadmap.md). A copy
 * whose frontmatter-stripped, whitespace-normalized body sha256 matches a
 * historically shipped template (core/foundation-placeholder-hashes.json —
 * frozen forever) carries provably zero user content: remove it, returning
 * the project to the clean "not founded" signal that /start-project fills.
 * Any file with user edits is untouched. specs/ is user content — never
 * recorded in the managed manifest, so orphan cleanup can never touch it.
 * Returns { removed: [rel], wouldRemove: [rel], keptAuthored, absent }.
 */
function migrateFoundationDocs(srcRoot, target) {
  const crypto = require('crypto');
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(srcRoot, 'core', 'foundation-placeholder-hashes.json'),
      'utf8'
    )
  );
  const result = { removed: [], wouldRemove: [], keptAuthored: 0, absent: 0 };
  for (const [rel, hashes] of Object.entries(manifest.paths)) {
    const abs = path.join(target, ...rel.split('/'));
    if (!fileExists(abs)) { result.absent++; continue; }
    // Normalization mirrors the manifest's recorded contract exactly:
    // CRLF→LF, strip one leading YAML frontmatter block, trim, single \n.
    let body = fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
    body = body.replace(/^---\n[\s\S]*?\n---\n/, '');
    body = body.trim() + '\n';
    const hash = crypto.createHash('sha256').update(body).digest('hex');
    if (!hashes.includes(hash)) { result.keptAuthored++; continue; }
    if (_dryRun) {
      console.log(`  ✋ would remove: ${rel} (untouched init placeholder — foundation docs are authored via /start-project, ADR-0008)`);
      result.wouldRemove.push(rel);
      continue;
    }
    fs.rmSync(abs);
    try { fs.rmdirSync(path.dirname(abs)); } catch { /* dir not empty — fine */ }
    console.log(`  🗑  removed: ${rel} (untouched init placeholder — foundation docs are authored via /start-project)`);
    result.removed.push(rel);
  }
  if (result.removed.length || result.wouldRemove.length) {
    console.log('  → project is not yet founded — run /start-project to author the foundation docs.');
  }
  return result;
}

/**
 * Phase 26 — Project Config (ADR-0009).
 *
 * init: after the specs skeleton, infer + write `specs/config.md` and the
 * derived `.momentum/config-cache.json` (only when the file is absent —
 * re-init leaves an authored file alone).
 *
 * upgrade: write inferred config for FOUNDED projects only (charter +
 * roadmap exist — ADR-0008); unfounded projects author them at /start-project.
 * When the file exists, refresh the derived cache from the content source of
 * truth and report any drift on the machine-inferable fields (never clobber
 * user edits).
 *
 * specs/ is user content — the config file is NOT recorded in the managed
 * manifest (orphan cleanup must never touch it). The cache is gitignored by the
 * existing `.momentum/*` rule.
 */
function installConfig(target, { dryRun, upgradeMode } = {}) {
  const prefsLib = require('../core/config');
  const specsDir = path.join(target, 'specs');
  if (!fileExists(specsDir)) return; // no specs skeleton → nothing to do
  const prefsPath = path.join(specsDir, 'config.md');
  const exists = fileExists(prefsPath);

  if (!exists) {
    // upgrade only writes config for founded projects (migration).
    if (upgradeMode && !prefsLib.isFounded(target)) return;
    const prefs = prefsLib.inferConfig(target);
    if (dryRun) {
      console.log(`  ✋ would add:     specs/config.md (inferred: language=${prefs.language}, forge=${prefs.git_forge})`);
      return;
    }
    prefsLib.writeConfig(specsDir, prefs, { inferred: true });
    prefsLib.writeConfigCache(target, prefs);
    console.log(`  + added:    specs/config.md (inferred: language=${prefs.language}, forge=${prefs.git_forge})`);
    return;
  }

  // File exists: refresh the derived cache from the content source of truth.
  // A present-but-garbage file parses to an all-defaults object; detect that
  // (zero known keys present in the raw file) and LEAVE it untouched rather
  // than silently overwriting the user's (broken) content with defaults.
  const raw = (() => {
    try {
      return prefsLib.parseConfigMarkdown(fs.readFileSync(prefsPath, 'utf8'));
    } catch {
      return {};
    }
  })();
  const hasAnyKey = prefsLib.KNOWN_KEYS.some((k) => k in raw);
  if (!hasAnyKey) {
    console.log(`  ⚠️  specs/config.md exists but is empty/unparseable — left untouched (fix or delete it)`);
    return;
  }
  const stored = prefsLib.readConfig(specsDir);
  if (!dryRun) prefsLib.writeConfigCache(target, stored);

  // Drift detection (upgrade only, founded only): report changed inferable
  // fields. Never clobber user edits — the user re-infers by deleting the file
  // or editing by hand.
  if (upgradeMode && prefsLib.isFounded(target)) {
    const inferred = prefsLib.inferConfig(target);
    const drifted = prefsLib.INFERABLE_KEYS.filter((k) => inferred[k] !== stored[k]);
    if (drifted.length) {
      console.log(`  ⚠️  specs/config.md drifted from manifests on: ${drifted.join(', ')} (edit by hand or delete the file + re-run 'momentum upgrade')`);
    }
  }
}

function removeOrphans(targetDir, prevManifest, currentSet, opts = {}) {
  if (!prevManifest || !Array.isArray(prevManifest.managedFiles)) return [];
  const currentRel = new Set(
    [...currentSet].map((abs) =>
      path.relative(targetDir, abs).split(path.sep).join('/')
    )
  );
  const removed = [];
  for (const entry of prevManifest.managedFiles) {
    // Phase 22c: entry can be a string path (new agents-map format) or { path, sha256 } (legacy)
    const relPath = typeof entry === 'string' ? entry : entry.path;
    if (!relPath) continue;
    if (currentRel.has(relPath)) continue;
    if (opts.keepRel && opts.keepRel.has(relPath)) {
      console.log(`  ⚠️  kept (not orphan-cleaned): ${relPath} — user-owned now`);
      continue;
    }
    const abs = path.join(targetDir, relPath);
    if (!fileExists(abs)) continue;
    removed.push(relPath);
    if (!opts.dryRun) {
      fs.copyFileSync(abs, abs + '.bak');
      fs.rmSync(abs);
    }
    console.log(
      `  ${opts.dryRun ? '✋ would remove' : '🗑  removed'}: ${relPath}` +
      `${opts.dryRun ? '' : ' (original saved as .bak)'}`
    );
  }
  return removed;
}

function listAvailableAgents(src = path.join(__dirname, '..')) {
  const adaptersDir = path.join(src, 'adapters');
  if (!fs.existsSync(adaptersDir)) return [];
  return fs.readdirSync(adaptersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(adaptersDir, name, 'adapter.js')))
    .sort();
}

function formatAvailableAgents(src = path.join(__dirname, '..')) {
  return listAvailableAgents(src).join(', ');
}

function loadAdapter(src, agent) {
  const adapterDir = path.join(src, 'adapters', agent);
  if (!fs.existsSync(adapterDir)) {
    console.error(`Error: Unknown agent '${agent}'.`);
    console.error(`Available: ${formatAvailableAgents(src)}`);
    process.exit(1);
  }
  return {
    adapterDir,
    adapter: require(path.join(adapterDir, 'adapter.js')),
  };
}

// ── Adapter contract — spawn(directive) (Phase 18) ───────────────────────────
//
// Every adapter MUST export a `spawn(directive)` function. The conductor
// (`core/swarm/conductor.js::buildSpawnDirectives`) produces platform-agnostic
// directives; the adapter dispatches them to its native runtime (Claude Code
// `claude --bg --cwd ...`, Codex `codex --cwd ...`, Antigravity `agy`, etc).
//
// Directive shape (canonical — produced by buildSpawnDirectives, consumed
// by adapter.spawn):
//
//   {
//     platform:    string,   // adapter id ("claude-code" | "codex" | "antigravity")
//     swarmId:     string,   // e.g. "0007-user-auth"
//     wave:        number,   // 1-indexed
//     repoId:      string,   // ecosystem member id
//     repoPath:    string,   // absolute path; supervisor's pinned cwd
//     phaseSlug:   string,   // e.g. "phase-3-user-auth"
//     branch:      string,
//     sessionId:   string,   // session id of the spawning conductor
//     recipePath:  string,   // absolute path to supervise.md
//     contextPath: string,   // optional — for tell / broadcast injection
//     env:         object,   // MOMENTUM_SWARM_* vars to inject
//   }
//
// Return contract: an array element of shape
//   { repoId, status, detail }
// where `status` is the child-process exit code (0 = ok, non-zero = failure,
// -1 = could not launch). adapter.spawn is invoked once PER directive so the
// per-repo result is the function's own return value.
//
// Pure stubs (adapters that do not yet implement a runtime dispatch) MUST
// return `{ repoId, status: -1, detail: 'not implemented' }` rather than
// throwing — the conductor stays robust to per-repo dispatch failures.
function adapterSupportsSpawn(adapter) {
  return adapter && typeof adapter.spawn === 'function';
}

function resolveAdapterSource(srcRoot, adapterDir, fileSpec) {
  const sourceBase = fileSpec.sourceBase || 'adapter';
  const base = sourceBase === 'package' ? srcRoot : adapterDir;
  return path.join(base, ...fileSpec.source);
}

function installPrimaryInstruction(srcRoot, targetDir, adapterDir, primaryInstruction) {
  if (!primaryInstruction) return null;
  const srcPath = resolveAdapterSource(srcRoot, adapterDir, primaryInstruction);
  const destPath = path.join(targetDir, ...primaryInstruction.destination);
  const label = primaryInstruction.label || primaryInstruction.destination.join('/');
  recordManaged(destPath); // managed (marker-owned) whether added or skipped

  console.log(`→ Installing ${label}...`);
  if (!fileExists(destPath)) {
    if (_dryRun) {
      console.log(`  ✋ would add:     ${label}`);
      return 'added';
    }
    const rendered = renderProjectName(
      fs.readFileSync(srcPath, 'utf8'),
      getProjectName(targetDir)
    );
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, rendered);
    return 'added';
  }

  console.log(`  ⚠️  ${label} already exists — skipping.`);
  return 'skipped';
}

function upgradePrimaryInstruction(srcRoot, targetDir, adapterDir, primaryInstruction) {
  if (!primaryInstruction) return null;
  const srcPath = resolveAdapterSource(srcRoot, adapterDir, primaryInstruction);
  const destPath = path.join(targetDir, ...primaryInstruction.destination);
  const label = primaryInstruction.label || primaryInstruction.destination.join('/');
  const projectName = getProjectName(targetDir);
  recordManaged(destPath); // managed (marker-owned)

  console.log(`→ Upgrading ${label}...`);
  if (primaryInstruction.markerAware) {
    return upgradeMarkedFile(srcPath, destPath, label, targetDir, projectName);
  }

  const srcContent = renderProjectName(fs.readFileSync(srcPath, 'utf8'), projectName);
  const relDest = path.relative(targetDir, destPath);
  if (!fileExists(destPath)) {
    if (_dryRun) {
      console.log(`  ✋ would add:     ${relDest}`);
      return 'added';
    }
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, srcContent);
    console.log(`  + added:    ${relDest}`);
    return 'added';
  }

  const destContent = fs.readFileSync(destPath, 'utf8');
  if (srcContent === destContent) return 'unchanged';

  if (_dryRun) {
    console.log(`  ✋ would upgrade: ${relDest}`);
    return 'updated';
  }
  fs.copyFileSync(destPath, destPath + '.bak');
  fs.writeFileSync(destPath, srcContent);
  console.log(`  ↑ upgraded: ${relDest} (original saved as .bak)`);
  return 'updated';
}

// ── Adapter overlay (FEAT-012, Phase 6) ──────────────────────────────────────
//
// Adapters may ship per-agent commands/agent-rules/scripts under
// `adapters/<name>/{commands,agent-rules,scripts}/`. These overlay onto the
// same destinations as the corresponding `core/<sub>/` content.
//
// Contract: additive-only. A given filename lives in EITHER `core/` OR exactly
// one adapter, never both. Duplicates are a hard error caught before any
// files are written. Generic content goes in `core/`; agent-specific in
// `adapters/<name>/`.

const DEFAULT_OVERLAY_DESTS = {
  commands: ['.claude', 'commands'],
  'agent-rules': ['.agent', 'rules'],
  scripts: ['scripts'],
  engines: ['.agent', 'engines'],
};

function listFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  const walk = (d, prefix) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name.startsWith('._') || entry.name === '.DS_Store') continue;
      const rel = prefix ? path.join(prefix, entry.name) : entry.name;
      if (entry.isDirectory()) walk(path.join(d, entry.name), rel);
      else result.push(rel);
    }
  };
  walk(dir, '');
  return result;
}

function detectOverlayConflicts(coreRoot, adapterRoot, subdirs) {
  const conflicts = [];
  for (const sub of subdirs) {
    const adapterSubdir = path.join(adapterRoot, sub);
    if (!fs.existsSync(adapterSubdir)) continue;
    const coreFiles = new Set(listFilesRecursive(path.join(coreRoot, sub)));
    for (const f of listFilesRecursive(adapterSubdir)) {
      if (coreFiles.has(f)) conflicts.push({ subdir: sub, file: f });
    }
  }
  return conflicts;
}

function failOnOverlayConflicts(coreRoot, adapterRoot, agent, dests) {
  const conflicts = detectOverlayConflicts(
    coreRoot,
    adapterRoot,
    Object.keys(dests)
  );
  if (conflicts.length === 0) return;
  console.error(
    `Error: duplicate overlay files in core/ and adapters/${agent}/.`
  );
  console.error('Each file may live in EITHER core/ OR exactly one adapter, never both.');
  for (const c of conflicts) {
    console.error(`  - ${c.subdir}/${c.file}`);
  }
  console.error('');
  console.error(
    'Resolution: keep the file in core/ if it is generic across agents, ' +
    'or in adapters/<agent>/ if it exploits an agent-specific capability. ' +
    'Delete the duplicate from the other location.'
  );
  process.exit(1);
}

function applyOverlay(adapterRoot, targetDir, dests, opts = {}) {
  for (const [sub, destParts] of Object.entries(dests)) {
    const overlaySrc = path.join(adapterRoot, sub);
    if (!fs.existsSync(overlaySrc)) continue;
    const dest = path.join(targetDir, ...destParts);
    const label = opts.upgradeMode ? 'Overlaying (upgrade)' : 'Overlaying';
    console.log(`→ ${label} ${sub} from adapter...`);
    copyDir(overlaySrc, dest, opts);
    if (sub === 'scripts' && fs.existsSync(dest)) {
      for (const f of fs.readdirSync(dest)) {
        if (f.endsWith('.sh')) fs.chmodSync(path.join(dest, f), 0o755);
      }
    }
  }
}

// ── Marker-based upgrade (ENH-010 / FEAT-011) ────────────────────────────────

const MARKER = '## Project Extensions';

/**
 * Split a file's content at the `## Project Extensions` heading.
 * Lossless: `managed + extensions === content` when marker is present.
 * Returns `{managed, extensions}` where `extensions` is null if no marker.
 */
function partitionByMarker(content) {
  const idx = content.indexOf('\n' + MARKER);
  if (idx === -1) return { managed: content, extensions: null };
  return {
    managed: content.slice(0, idx),
    extensions: content.slice(idx), // starts with '\n## Project Extensions'
  };
}

/**
 * Upgrade a marker-aware file. Three paths:
 *   - target missing → write source as-is
 *   - target has marker → replace managed section, preserve extensions
 *   - target lacks marker → backup as .bak, write source, append old content under marker
 *
 * Returns one of: 'added', 'updated', 'unchanged', 'migrated'.
 */
function upgradeMarkedFile(srcPath, destPath, label, root, projectName) {
  const rel = path.relative(root || process.cwd(), destPath);
  recordManaged(destPath); // managed (marker-owned) in all branches
  const render = (content) =>
    projectName ? renderProjectName(content, projectName) : content;

  if (!fileExists(destPath)) {
    if (_dryRun) {
      console.log(`  ✋ would add:     ${rel}`);
      return 'added';
    }
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, render(fs.readFileSync(srcPath, 'utf8')));
    console.log(`  + added:    ${rel}`);
    return 'added';
  }

  const srcContent = render(fs.readFileSync(srcPath, 'utf8'));
  const destContent = fs.readFileSync(destPath, 'utf8');
  const destParts = partitionByMarker(destContent);

  if (destParts.extensions === null) {
    // Pre-marker file — back up, write fresh template, append old content
    // under the marker so nothing is lost. The user can manually de-dupe.
    if (_dryRun) {
      console.log(`  ✋ would migrate: ${rel} (no marker — original would be saved as .bak)`);
      return 'migrated';
    }
    fs.copyFileSync(destPath, destPath + '.bak');
    const today = new Date().toISOString().slice(0, 10);
    const migrated =
      srcContent.replace(/\s+$/, '') +
      `\n\n<!-- migrated from pre-marker version on ${today}` +
      ` — original at ${path.basename(destPath)}.bak -->\n` +
      destContent.replace(/\s+$/, '') +
      '\n';
    fs.writeFileSync(destPath, migrated);
    console.log(`  ↻ migrated: ${rel} (no marker — original saved as .bak)`);
    return 'migrated';
  }

  const srcParts = partitionByMarker(srcContent);
  const newContent = srcParts.managed + destParts.extensions;

  if (newContent === destContent) {
    return 'unchanged';
  }

  if (_dryRun) {
    console.log(`  ✋ would upgrade: ${rel} (managed section replaced; extensions preserved)`);
    return 'updated';
  }
  fs.copyFileSync(destPath, destPath + '.bak');
  fs.writeFileSync(destPath, newContent);
  console.log(
    `  ↑ upgraded: ${rel} (managed section replaced; extensions preserved; original saved as .bak)`
  );
  return 'updated';
}

// ── Init command ──────────────────────────────────────────────────────────────

// ── Git hooks (Phase 19 — Lifecycle Hardening) ─────────────────────────────────
//
// Install momentum's vendor-neutral git-lifecycle hooks into the target's
// `.githooks/` dir and point `core.hooksPath` at it. Zero-dependency: plain
// shell wrappers + a node dispatcher, no husky/lefthook.
//
// Warn-not-clobber (the BUG-008 lesson): if the target already uses a custom
// `core.hooksPath` or husky, momentum skips rather than overwriting.
// True if `filePath` is one of momentum's own shipped hook files (vs a foreign
// hook of the same name). Recognizes the current header signature AND legacy
// pre-BUG-011 installs, so `upgrade` can self-heal older repos in place.
function isMomentumHookFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const c = fs.readFileSync(filePath, 'utf8');
    return /momentum[^\n]*hook/i.test(c) || c.includes('Lifecycle Hardening');
  } catch {
    return false;
  }
}

// Install momentum's hook files into `hooksDest` ADDITIVELY (BUG-011):
//   missing            → install it
//   existing & ours    → upgrade in place (.bak first)
//   existing & foreign → leave untouched (warn-not-clobber)
// Skips macOS AppleDouble (`._*`) sidecars so exFAT volumes don't leak junk.
function installHookFiles(hooksSrc, hooksDest) {
  const out = { installed: [], upgraded: [], unchanged: [], skipped: [] };
  if (!_dryRun) fs.mkdirSync(hooksDest, { recursive: true });
  for (const f of fs.readdirSync(hooksSrc)) {
    if (f.startsWith('._') || f === '.DS_Store') continue;
    const srcF = path.join(hooksSrc, f);
    if (!fs.statSync(srcF).isFile()) continue;
    const destF = path.join(hooksDest, f);
    if (fs.existsSync(destF)) {
      if (isMomentumHookFile(destF)) {
        // Identical content → no rewrite and NO .bak. Backing up identical
        // files is how `.githooks/*.bak` litter got committed (BUG-017);
        // the file still counts for recordManaged + the exec-bit re-chmod.
        if (fs.readFileSync(srcF, 'utf8') === fs.readFileSync(destF, 'utf8')) {
          recordManaged(destF);
          out.unchanged.push(f);
        } else {
          if (!_dryRun) {
            fs.copyFileSync(destF, destF + '.bak');
            fs.copyFileSync(srcF, destF);
          }
          recordManaged(destF);
          out.upgraded.push(f);
        }
      } else {
        out.skipped.push(f); // foreign hook — never clobber
      }
    } else {
      if (!_dryRun) fs.copyFileSync(srcF, destF);
      recordManaged(destF);
      out.installed.push(f);
    }
  }
  return out;
}

function installGitHooks(src, target, opts = {}) {
  const hooksSrc = path.join(src, 'core', 'git-hooks');
  if (!fs.existsSync(hooksSrc)) return;

  const ourPath = LIFECYCLE.hooksPath; // '.githooks'
  const isGitRepo = fs.existsSync(path.join(target, '.git'));

  // husky is the one genuine skip — momentum won't fight a husky setup.
  if (fs.existsSync(path.join(target, '.husky'))) {
    console.log(`  ⚠️  git hooks: target uses husky (.husky/) — skipping momentum git-hook install.`);
    console.log(`     To enable manually, copy core/git-hooks/* into your hooks dir.`);
    return;
  }

  let existingHooksPath = '';
  if (isGitRepo) {
    const cfg = spawnSync('git', ['-C', target, 'config', '--local', '--get', 'core.hooksPath'], {
      encoding: 'utf8',
    });
    existingHooksPath = (cfg.stdout || '').trim();
  }

  // BUG-011: when a core.hooksPath is already configured (even the default
  // .git/hooks), RESPECT it and install momentum's hooks ADDITIVELY into it.
  // The old guard skipped the install entirely in this case, leaving repos with
  // zero enforcement hooks while reporting success. Only adopt .githooks and
  // set the config ourselves when nothing is configured.
  const usingConfiguredPath = !!(existingHooksPath && existingHooksPath !== ourPath);
  const destRel = usingConfiguredPath ? existingHooksPath : ourPath;
  const hooksDest = path.isAbsolute(destRel) ? destRel : path.join(target, destRel);

  const res = installHookFiles(hooksSrc, hooksDest);

  if (_dryRun) {
    console.log(
      `  ✋ would ${usingConfiguredPath ? `install momentum hooks into ${destRel}/` : `set core.hooksPath → ${ourPath}/`}`
    );
    return;
  }

  // Executable bit on every momentum-managed hook file — including unchanged
  // ones, so upgrade keeps self-healing exec bits on old installs (git only
  // execs the git-named wrappers, but +x is harmless on the node libs).
  for (const f of [...res.installed, ...res.upgraded, ...res.unchanged]) {
    if (f.endsWith('.md')) continue;
    const fp = path.join(hooksDest, f);
    if (fs.existsSync(fp)) fs.chmodSync(fp, 0o755);
  }

  // Adopt .githooks + point core.hooksPath at it only when nothing was set.
  if (isGitRepo && !usingConfiguredPath) {
    spawnSync('git', ['-C', target, 'config', '--local', 'core.hooksPath', ourPath]);
  }

  if (res.installed.length + res.upgraded.length > 0) {
    const where = usingConfiguredPath
      ? `${destRel}/ (your configured core.hooksPath)`
      : `.githooks/ (core.hooksPath set)`;
    console.log(`  ✓ git hooks installed → ${where}.`);
  } else if (res.skipped.length === 0) {
    console.log(`  ✓ git hooks: already current at ${destRel}/.`);
  }
  for (const f of res.skipped) {
    console.log(`  ⚠️  git hooks: ${destRel}/${f} exists and is not momentum's — left untouched.`);
  }
  if (!isGitRepo) {
    console.log(`  ⚠️  not a git repo — hooks copied to ${destRel}/; after 'git init' run:`);
    console.log(`       git config core.hooksPath ${destRel}`);
  }
}

// ── Ecosystem-root guard (BUG-016) ────────────────────────────────────────────
//
// The project-mode scaffold must never land in an ecosystem coordination
// root. A directory whose ecosystem.json carries both `name` and a `members`
// array is the coordination layer: its CLAUDE.md / AGENTS.md are the
// ecosystem templates owned by `momentum ecosystem init|upgrade`, and no
// specs/ tree exists there. Installing the project scaffold over it points
// every future agent session at specs/status.md — a file that can never
// exist in a coordination root. Requiring BOTH keys keeps a foreign
// ecosystem.json (e.g. PM2's) from false-positiving the guard.
function assertNotEcosystemRoot(target, command) {
  const manifestPath = path.join(target, 'ecosystem.json');
  if (!fileExists(manifestPath)) return;
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return; // non-JSON — not a momentum manifest
  }
  if (
    !manifest || typeof manifest !== 'object' ||
    !manifest.name || !Array.isArray(manifest.members)
  ) {
    return;
  }
  throw new Error(
    `${command}: ${target} is the coordination root of ecosystem "${manifest.name}" ` +
      `(ecosystem.json present) — the project scaffold does not belong here.\n` +
      `  The coordination root's CLAUDE.md / AGENTS.md are managed by the ecosystem commands:\n` +
      `    momentum ecosystem upgrade          # refresh root instructions + sweep member repos\n` +
      `  To install momentum into a member repo, run it from (or point it at) that repo:\n` +
      `    momentum ${command} <member-path>`
  );
}

function init(targetDir, agent, opts = {}) {
  const target = path.resolve(targetDir);
  const src = path.join(__dirname, '..');

  assertNotEcosystemRoot(target, 'init');

  // Load adapter
  const { adapterDir, adapter } = loadAdapter(src, agent);
  const dests = adapter.destinations || DEFAULT_OVERLAY_DESTS;
  const coreRoot = path.join(src, 'core');

  // Pre-flight: error before any writes if adapter overlay duplicates a core filename
  failOnOverlayConflicts(coreRoot, adapterDir, agent, dests);

  console.log(`Installing momentum into: ${target} [agent: ${agent}]`);
  if (opts.dryRun) console.log('(dry run — no files will be written)');
  console.log('');

  _dryRun = !!opts.dryRun;
  _managedCollector = new Set();
  try {
  // .claude/commands/
  console.log('→ Installing slash commands...');
  copyDir(
    path.join(src, 'core', 'commands'),
    path.join(target, ...dests.commands),
    { backup: true, root: target }
  );

  // scripts/
  console.log('→ Installing hook scripts...');
  // Phase 16 Rework: copy the entire core/scripts/ tree. Previously only
  // check-history-reminder.sh was copied explicitly; brainstorm-gate.sh
  // lived in adapters/claude-code/scripts/ and reached the target via
  // the overlay. brainstorm-gate.sh now ships from core so Codex and
  // Antigravity also pick it up via the same scripts/ destination.
  copyDir(
    path.join(src, 'core', 'scripts'),
    path.join(target, ...dests.scripts),
    { backup: true, root: target }
  );
  if (!_dryRun) {
    for (const f of fs.readdirSync(path.join(target, ...dests.scripts))) {
      if (f.endsWith('.sh')) {
        fs.chmodSync(path.join(target, ...dests.scripts, f), 0o755);
      }
    }
  }
  // Phase 9 — ecosystem session-append helper, sourced by check-history-reminder.
  const sessionSrc = path.join(src, 'core', 'ecosystem', 'scripts', 'session-append.sh');
  if (fs.existsSync(sessionSrc)) {
    const sessionDest = path.join(target, ...dests.scripts, 'session-append.sh');
    copyFile(sessionSrc, sessionDest);
    if (!_dryRun) fs.chmodSync(sessionDest, 0o755);
  }

  // .githooks/ — git-lifecycle enforcement hooks (Phase 19)
  console.log('→ Installing git-lifecycle hooks...');
  installGitHooks(src, target);

  // core/engines/
  console.log('→ Installing execution engines...');
  if (fs.existsSync(path.join(src, 'core', 'engines'))) {
    copyDir(
      path.join(src, 'core', 'engines'),
      path.join(target, ...(dests.engines || ['.agent', 'engines'])),
      { backup: true, root: target }
    );
  }

  // .agent/rules/project.md is retired (Phase 23 / ADR-0004): the full rules
  // now ride each adapter's auto-loaded primary instruction file. Fresh
  // installs ship nothing here; `upgrade` migrates existing copies.

  // specs/ skeleton (root instruction file is adapter-owned)
  console.log('→ Scaffolding project specs...');
  const specsSrc = path.join(src, 'core', 'specs-templates');
  copyDir(specsSrc, target, {
    skipIfExists: true,
    // CLAUDE.md is adapter-owned (written separately); config.md is
    // inferred per-project by installConfig (Phase 26) — neither is
    // copied as a static template.
    skipRelPaths: new Set(['CLAUDE.md', 'config.md']),
    record: false, // specs are install-once / user-owned — never orphan them
  });

  // Phase 26 — infer + write specs/config.md + the derived hook cache.
  console.log('→ Inferring project config...');
  installConfig(target, { dryRun: _dryRun });

  installPrimaryInstruction(src, target, adapterDir, adapter.primaryInstruction);

  // Adapter overlay — per-agent commands/agent-rules/scripts (additive)
  applyOverlay(adapterDir, target, dests, { backup: true, root: target });

  // Coding-agent-specific steps
  adapter.runInstall(target, adapterDir, { copyFile, copyDir, fileExists, recordManaged, dryRun: _dryRun });

  // Lock file — record the version-of-record + managed-file set (Phase 20)
  writeInstalledManifest(target, { version: pkg.version, agent, files: _managedCollector, dryRun: _dryRun });
  } finally {
    _managedCollector = null;
    _dryRun = false;
  }

  if (opts.dryRun) {
    console.log('');
    console.log('✓ Dry run complete — no files were written.');
    console.log('  Re-run without --dry-run to apply.');
    return;
  }

  console.log('');
  console.log('✓ momentum installed successfully.');
  console.log('');
  console.log('Next steps:');
  console.log('');
  const displayName = adapter.displayName || agent;
  console.log('  Explore the idea first (writes nothing):');
  console.log(`    Open ${displayName} and run: /brainstorm-idea`);
  console.log('');
  console.log('  Found the project — author the charter + roadmap, plan Phase 0:');
  console.log(`    Open ${displayName} and run: /start-project`);
  console.log('');
  console.log('  Already founded — plan your next phase:');
  console.log(`    Open ${displayName} and run: /brainstorm-phase`);
  console.log('');
  console.log('  See docs: https://github.com/LiminaLabsAI/momentum');
}

// ── Upgrade command ───────────────────────────────────────────────────────────

function upgrade(targetDir, agent, opts = {}) {
  const target = path.resolve(targetDir);
  const src = path.join(__dirname, '..');

  assertNotEcosystemRoot(target, 'upgrade');

  // Load adapter
  const { adapterDir, adapter } = loadAdapter(src, agent);
  const dests = adapter.destinations || DEFAULT_OVERLAY_DESTS;
  const coreRoot = path.join(src, 'core');

  // Pre-flight: error before any writes if adapter overlay duplicates a core filename
  failOnOverlayConflicts(coreRoot, adapterDir, agent, dests);

  console.log(`Upgrading momentum in: ${target} [agent: ${agent}]`);
  if (opts.dryRun) console.log('(dry run — no files will be written)');
  console.log('');

  const upgradeOpts = { upgradeMode: true, root: target };

  // Phase 22c (ADR-0007): scope orphan cleanup to THIS agent's prior files only.
  // Load the installed state (handles legacy migration), extract only the agent
  // being upgraded — other agents' files are never eligible for removal.
  const prevState = loadInstalledState(target);
  const prevAgentEntry = prevState.agents[agent];
  const prevAgentFiles = prevAgentEntry && Array.isArray(prevAgentEntry.files)
    ? prevAgentEntry.files
    : [];

  _dryRun = !!opts.dryRun;
  _managedCollector = new Set();
  let agentRulesResult, primaryInstructionResult, gitignoreResult, foundationResult, orphans = [];
  try {
  // Upgrade slash commands
  console.log('→ Upgrading slash commands...');
  copyDir(
    path.join(src, 'core', 'commands'),
    path.join(target, ...dests.commands),
    upgradeOpts
  );

  // Upgrade hook scripts
  console.log('→ Upgrading hook scripts...');
  copyDir(
    path.join(src, 'core', 'scripts'),
    path.join(target, ...dests.scripts),
    upgradeOpts
  );
  // Phase 9 — ecosystem session-append helper lives outside core/scripts/
  // (it belongs to the ecosystem subsystem) but ships alongside the hook.
  const sessionUpgradeSrc = path.join(src, 'core', 'ecosystem', 'scripts', 'session-append.sh');
  if (fs.existsSync(sessionUpgradeSrc)) {
    const sessionUpgradeDest = path.join(target, ...dests.scripts, 'session-append.sh');
    copyFile(sessionUpgradeSrc, sessionUpgradeDest);
  }
  // Re-apply executable bit to all .sh scripts
  const scriptsDir = path.join(target, ...dests.scripts);
  if (!_dryRun && fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir)) {
      if (f.endsWith('.sh')) fs.chmodSync(path.join(scriptsDir, f), 0o755);
    }
  }

  // Upgrade git-lifecycle hooks (Phase 19)
  console.log('→ Upgrading git-lifecycle hooks...');
  installGitHooks(src, target, { upgradeMode: true });

  // Upgrade execution engines
  console.log('→ Upgrading execution engines...');
  if (fs.existsSync(path.join(src, 'core', 'engines'))) {
    copyDir(
      path.join(src, 'core', 'engines'),
      path.join(target, ...(dests.engines || ['.agent', 'engines'])),
      upgradeOpts
    );
  }

  // Agent rules — retired surface (Phase 23 / ADR-0004). Migrate any
  // installed copy: pristine (matches a shipped historical revision) →
  // remove; customized → keep with a deprecation warning.
  console.log('→ Migrating agent rules (retired surface)...');
  agentRulesResult = migrateAgentRules(src, target, dests);

  // BUG-022: the marker-aware rewrite below replaces the whole managed
  // region, which wipes the ecosystem pointer block a registered member's
  // instruction file carries (init injects it; upgrade used to lose it).
  // Snapshot whether the block exists BEFORE the rewrite — we only ever
  // PRESERVE an existing block, never add one the user didn't have (adding
  // would dirty files mid-upgrade and break autostash restores).
  const pointerLib = require('../core/ecosystem/lib/pointer');
  const primaryRel = adapter.primaryInstruction.destination.join('/');
  let hadPointerBlock = false;
  try {
    hadPointerBlock = pointerLib.POINTER_BEGIN_RE.test(
      fs.readFileSync(path.join(target, primaryRel), 'utf8')
    );
  } catch (_e) { /* absent file → nothing to preserve */ }

  // Upgrade adapter-owned root instruction file
  primaryInstructionResult = upgradePrimaryInstruction(
    src,
    target,
    adapterDir,
    adapter.primaryInstruction
  );

  if (hadPointerBlock && !_dryRun) {
    try {
      const ecoState = require('../core/ecosystem/lib/state');
      const reg = ecoState.findRegistration(target);
      if (reg && fileExists(path.join(target, primaryRel))) {
        pointerLib.ensurePointerInjected(target, primaryRel, reg.rootPath, reg.ecosystemName);
        console.log(`  ↺ ecosystem pointer block preserved (member of "${reg.ecosystemName}")`);
      }
    } catch (_e) {
      /* pointer restoration is best-effort — never blocks an upgrade */
    }
  }

  // Adapter overlay upgrade — per-agent commands/agent-rules/scripts (additive)
  applyOverlay(adapterDir, target, dests, upgradeOpts);

  // Delegate adapter-specific upgrade
  adapter.runUpgrade(target, adapterDir, { copyFile, copyDir, fileExists, recordManaged, dryRun: _dryRun });

  // OKF bundle migration (Phase 24, ADR-0005). specs/ is USER content —
  // these writes are deliberately not recorded in the managed manifest so
  // orphan cleanup can never touch them.
  console.log('→ Migrating specs/ to the OKF bundle format...');
  const okfResult = require('../core/lib/okf-migrate').migrate(target, { dryRun: _dryRun });
  if (!okfResult.applicable) {
    console.log('  (no specs/ directory — skipped)');
  } else {
    const okfChanges = okfResult.writes.length + okfResult.converted.length
      + okfResult.injected.length + okfResult.deletes.length + okfResult.indexes.length;
    if (okfChanges === 0) {
      console.log('  = specs/ is already an OKF bundle (no changes)');
    } else {
      if (okfResult.writes.length) console.log(`  ✓ index.json distributed into ${okfResult.writes.length} phase overview.md file(s)`);
      if (okfResult.converted.length) console.log('  ✓ impact-map.json → decisions/impact-map.md');
      if (okfResult.injected.length) console.log(`  ✓ \`type\` frontmatter added to ${okfResult.injected.length} spec file(s)`);
      if (okfResult.deletes.length) console.log(`  ✓ legacy removed: ${okfResult.deletes.map((d) => d.rel).join(', ')}`);
      if (okfResult.indexes.length) console.log(`  ✓ bundle indexes: ${okfResult.indexes.join(', ')}`);
    }
    for (const w of okfResult.warnings) console.log(`  ⚠️  ${w}`);
  }

  // Additively refresh .gitignore (append missing momentum/OS ignore rules).
  console.log('→ Refreshing .gitignore...');
  gitignoreResult = refreshGitignore(src, target);

  // Foundation docs — authored, not scaffolded (Phase 25 / ADR-0008).
  // Remove provably-untouched init placeholders; authored files stay.
  console.log('→ Checking foundation docs (authored, not scaffolded)...');
  foundationResult = migrateFoundationDocs(src, target);
  if (!foundationResult.removed.length && !foundationResult.wouldRemove.length) {
    console.log('  = no untouched placeholders (foundation docs are authored or absent)');
  }

  // Phase 26 — project config (ADR-0009). Founded projects get an
  // inferred specs/config.md on first upgrade; existing files get their
  // derived cache refreshed + drift reported (never clobbered).
  console.log('→ Inferring project config...');
  installConfig(target, { dryRun: _dryRun, upgradeMode: true });

  // Orphan cleanup — only remove files this agent's prior version installed
  // that this version no longer ships. Other agents' files are untouched.
  orphans = removeOrphans(target, { managedFiles: prevAgentFiles }, _managedCollector, {
    dryRun: _dryRun,
    // A customized project.md is user-owned now — never orphan-clean it.
    keepRel: agentRulesResult === 'kept-customized'
      ? new Set([[...dests['agent-rules'], 'project.md'].join('/')])
      : undefined,
  });

  // Lock file — rewrite the version-of-record + managed-file set (Phase 20)
  writeInstalledManifest(target, { version: pkg.version, agent, files: _managedCollector, dryRun: _dryRun });
  } finally {
    _managedCollector = null;
    _dryRun = false;
  }

  console.log('');
  if (opts.dryRun) {
    console.log('✓ Dry run complete — no files were written.');
    if (orphans.length) {
      console.log(`  ${orphans.length} file(s) would be removed as orphaned (see ✋ lines above).`);
    }
    console.log('  Re-run without --dry-run to apply.');
    console.log('');
    return;
  }
  console.log('✓ Upgrade complete.');
  if (adapter.primaryInstruction) {
    const label = adapter.primaryInstruction.label ||
      adapter.primaryInstruction.destination.join('/');
    console.log(`  ${label}:           ${primaryInstructionResult}`);
  }
  console.log(`  agent-rules:         ${agentRulesResult}`);
  console.log(`  .gitignore:          ${gitignoreResult}`);
  if (foundationResult && foundationResult.removed.length) {
    console.log(`  foundation docs:     removed ${foundationResult.removed.length} untouched placeholder(s) — not yet founded; run /start-project`);
  }
  if (orphans.length) {
    console.log(`  removed (orphaned):  ${orphans.length} file(s) — see 🗑 lines above`);
  }
  console.log('');
}

// ── Update check ─────────────────────────────────────────────────────────────

/** Returns true if version `a` is strictly greater than version `b` (semver). Null-safe — null/non-null comparisons always prefer the non-null value. */
function isNewerVersion(a, b) {
  if (!a && !b) return false;
  if (!a) return false;   // null is never newer than a real version
  if (!b) return true;    // a real version is always newer than null
  const parse = (v) => v.replace(/^v/, '').split('.').map(Number);
  const [aMaj, aMin, aPatch] = parse(a);
  const [bMaj, bMin, bPatch] = parse(b);
  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  return aPatch > bPatch;
}

/**
 * Stale-CLI warning for `upgrade` (Phase 20 G2 / D2 — warn, never block).
 * `momentum upgrade` copies files from the INSTALLED CLI, not from npm — so a
 * stale global/npx CLI can only ever install stale files. When the published
 * `latest` is newer than the running CLI, return a prominent warning telling
 * the user to update the CLI first. Returns null when the CLI is current
 * (or the version check was unavailable). Pure + unit-testable.
 */
function formatStaleCliWarning(current, latest) {
  if (!latest || !isNewerVersion(latest, current)) return null;
  return [
    '',
    '  ┌────────────────────────────────────────────────────────────────┐',
    `  │  ⚠  Installed momentum CLI is ${current}, but ${latest} is published.`,
    '  │     `upgrade` copies files from the INSTALLED CLI — your project',
    '  │     files will only ever be as new as the CLI itself.',
    '  │     Update the CLI first, then re-run upgrade:',
    '  │        npm i -g @limina-labs/momentum@latest',
    '  └────────────────────────────────────────────────────────────────┘',
    '',
  ].join('\n');
}

// ── Autostash (Phase 20 follow-up) ───────────────────────────────────────────
//
// Lets a DIRTY repo be upgraded without committing/stashing by hand: stash the
// in-flight work (incl. untracked), run the upgrade on the now-clean tree, then
// restore the work exactly as it was. Mirrors `git rebase --autostash`.
//
// Safety invariant: on a pop that can't apply cleanly (the upgrade touched a
// file the user had also changed), we NEVER drop the stash — the user's work
// stays recoverable in `git stash list`, and we say so loudly.

/** Returns `git status --porcelain` output, or null if not a git repo. */
function gitPorcelain(repoPath) {
  const r = spawnSync('git', ['-C', repoPath, 'status', '--porcelain'], { encoding: 'utf8' });
  return r.status === 0 ? (r.stdout || '') : null;
}

/**
 * Run `fn` (an upgrade) inside a stash/pop so a dirty working tree is preserved.
 * No-op wrapper when the tree is already clean or not a git repo.
 * Returns { stashed, restored, conflict, result }.
 */
function withAutostash(repoPath, fn) {
  const status = gitPorcelain(repoPath);
  const dirty = status !== null && status.trim().length > 0;
  if (!dirty) return { stashed: false, restored: true, conflict: false, result: fn() };

  const push = spawnSync(
    'git',
    ['-C', repoPath, 'stash', 'push', '--include-untracked', '-m', 'momentum-autostash'],
    { encoding: 'utf8' },
  );
  if (push.status !== 0) {
    throw new Error(`autostash: \`git stash\` failed — ${(push.stderr || '').trim()}`);
  }
  console.log('  ⎘ autostash: stashed your in-flight work (will restore after upgrade).');

  let result, conflict = false, restored = false;
  try {
    result = fn();
  } finally {
    const pop = spawnSync('git', ['-C', repoPath, 'stash', 'pop'], { encoding: 'utf8' });
    if (pop.status === 0) {
      restored = true;
      console.log('  ⎗ autostash: restored your in-flight work.');
    } else {
      // Pop failed (overlap with what the upgrade wrote). DO NOT drop the stash.
      conflict = true;
      console.log('  ⚠️  autostash: could not re-apply your changes cleanly — the upgrade');
      console.log('     touched a file you had also modified. YOUR WORK IS SAFE in the stash:');
      console.log(`       (cd "${repoPath}" && git stash list)   # your changes are stash@{0}`);
      console.log('       resolve by hand: `git checkout-index -a` is NOT needed — run `git stash pop` and fix conflicts.');
    }
  }
  return { stashed: true, restored, conflict, result };
}

function checkForUpdates() {
  return new Promise((resolve) => {
    const https = require('https');
    const os = require('os');
    const cacheFile = path.join(os.tmpdir(), '.momentum-version-check');

    // Use cache — skip network if checked within 24 hours
    try {
      const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (Date.now() - cache.checkedAt < 24 * 60 * 60 * 1000) {
        resolve(isNewerVersion(cache.latestVersion, pkg.version) ? cache.latestVersion : null);
        return;
      }
    } catch { /* no cache or unreadable — proceed to network check */ }

    const req = https.get(
      'https://registry.npmjs.org/@limina-labs/momentum/latest',
      { timeout: 3000 },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const latestVersion = JSON.parse(data).version;
            try {
              fs.writeFileSync(cacheFile, JSON.stringify({ latestVersion, checkedAt: Date.now() }));
            } catch { /* ignore cache write failures */ }
            resolve(isNewerVersion(latestVersion, pkg.version) ? latestVersion : null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// ── Usage ─────────────────────────────────────────────────────────────────────

function usage() {
  console.log(`
momentum v${pkg.version} — Agent-agnostic, specs-driven development framework

Use momentum for a single project, or to orchestrate multiple related
projects as one ecosystem from a single agent session.

Single-project use:
  momentum init [target-dir]          Scaffold momentum into one project
                                      (defaults to current directory)
  momentum upgrade [target-dir]       Update momentum files in an existing project

Ecosystem use — entry/exit commands (run from any repo):
  momentum init --ecosystem <name>    Scaffold an ecosystem in a sibling dir
                                      and register this repo as the first member
  momentum join <ecosystem-path>      Register THIS repo as a member of an
                                      existing ecosystem
  momentum leave                      Detach THIS repo from its ecosystem
  momentum doctor                     Diagnose state + list available transitions
  momentum antigravity plugin-pack    Pack momentum skills as a native Antigravity plugin ([--global])

Ecosystem use — operator toolkit (advanced):
  momentum ecosystem <sub> [...]      Subcommands: init | add | remove | status

Orchestration — work across ecosystem members from one session:
  momentum scout <repo> "<prompt>"    Read-only context fetch from one member
  momentum dispatch <r1> <r2> ...     Parallel multi-repo fan-out + synthesis
    --prompt "<text>"                 (require --prompt; --sequential for testing)
  momentum handoff <repo>             Write a context block for <repo> to pick up
  momentum continue [--handoff <id>]  Pick up a pending handoff in this repo

Swarm — sustained parallel multi-project feature delivery (Phase 17+, Claude Code):
  momentum swarm <sub> [...]          Subcommands: start | status | tell | broadcast |
                                       verify | complete | resume | cancel | budget |
                                       claim | release | focus | join | absorb

Lanes — concurrent workstreams in ONE repo (Phase 21b, Rule 15):
  momentum lanes                      Board: every active lane + queue pressure
  momentum lanes <sub> [...]          Subcommands: open | done | close | queue |
                                       signal | inbox | land (see: momentum lanes help)

Waves — wave plan from dependency annotations (Phase 21c, one engine every scale):
  momentum waves                      Phase-scale waves (overview.md frontmatter "deps")
  momentum waves --tasks [ref]        Task-group waves for a tasks.md
                                       (default: the phase bound to your branch)

OKF — specs/ as an Open Knowledge Format bundle (Phase 24, ADR-0005):
  momentum okf check [dir]            OKF v0.1 conformance report for <dir>/specs
  momentum okf index [dir]            Regenerate bundle indexes (root/phases/decisions)

Options:
  --agent <name>                      Agent to install for. \`init\` asks when this
                                      is omitted (and requires it without a TTY)
                                      Available: ${formatAvailableAgents()}
  --dry-run                           init/upgrade: preview the action set; write nothing
  --autostash                         upgrade: stash a dirty tree, upgrade, then restore it
  --no-ecosystem                      Skip the post-init auto-detect prompt
  -h, --help                          Show this help message
  -v, --version                       Show version number

Examples:
  # Single project (unchanged from v0.12.0):
  npx @limina-labs/momentum init
  npx @limina-labs/momentum init ./my-project --agent opencode

  # Ecosystem from scratch:
  npx @limina-labs/momentum init --ecosystem my-eco

  # Add THIS repo to an existing ecosystem:
  npx @limina-labs/momentum join ../my-eco

  # Where am I?
  npx @limina-labs/momentum doctor
`.trim());
}

// ── Phase 10 init extensions: --ecosystem + auto-detect ──────────────────────

/**
 * Parse Phase 10 init-only flags out of argv in place.
 * Removes the matched tokens; returns the parsed options + remaining target.
 *
 * Supported flags:
 *   --ecosystem <name>     Scaffold ecosystem in sibling dir, register this repo.
 *   --no-ecosystem         Bypass the post-init auto-detect prompt.
 */
function extractInitFlags(args) {
  // args[0] === 'init' — leave it; consume the rest.
  const out = { target: undefined, ecosystem: undefined, noEcosystem: false };
  const filtered = ['init'];
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '--ecosystem') {
      out.ecosystem = args[i + 1];
      i++;
    } else if (a === '--no-ecosystem') {
      out.noEcosystem = true;
    } else if (!out.target && !a.startsWith('--')) {
      out.target = a;
    } else {
      filtered.push(a);
    }
  }
  // Splice in place so any downstream consumers see the cleaned args.
  args.length = 0;
  for (const a of filtered) args.push(a);
  return out;
}

/**
 * After `init` succeeds, optionally:
 *   - scaffold an ecosystem (when --ecosystem <name> was passed)
 *   - prompt the user to register as a member (auto-detect)
 *
 * Single-project usage (no flags, no adjacent ecosystem) is a no-op.
 */
async function postInitEcosystem(targetDir, opts) {
  const target = path.resolve(targetDir);
  if (opts.ecosystem) {
    return scaffoldEcosystemAndJoin(target, opts.ecosystem);
  }
  if (opts.noEcosystem) return;
  return maybePromptForAutoEcosystem(target);
}

function scaffoldEcosystemAndJoin(target, ecosystemName) {
  if (!/^[a-z][a-z0-9-]*$/.test(ecosystemName)) {
    throw new Error(
      `init --ecosystem: name "${ecosystemName}" must match /^[a-z][a-z0-9-]*$/.`,
    );
  }
  const parentDir = path.dirname(target);
  const ecosystemDir = path.join(parentDir, ecosystemName);
  if (fs.existsSync(ecosystemDir)) {
    throw new Error(
      `init --ecosystem: ${ecosystemDir} already exists. Refusing to overwrite.`,
    );
  }

  const { runEcosystem } = require('./ecosystem');
  const pointer = require('../core/ecosystem/lib/pointer');

  let createdEcosystem = false;
  let injectedPointer = false;
  const cwd0 = process.cwd();
  try {
    // Scaffold the ecosystem root via existing CLI surface, run from parentDir
    // so cmdInit creates ./<name>/ under it.
    process.chdir(parentDir);
    runEcosystem(['init', ecosystemName]);
    createdEcosystem = true;

    // Now register this repo as a member, using realpathed absolutes so
    // path.relative produces a clean ../target instead of a cross-symlink
    // monstrosity (on macOS where /tmp → /private/tmp).
    process.chdir(target);
    let targetReal = target;
    let ecosystemReal = ecosystemDir;
    try { targetReal = fs.realpathSync(target); } catch (_e) {}
    try { ecosystemReal = fs.realpathSync(ecosystemDir); } catch (_e) {}
    runEcosystem(['add', targetReal, '--ecosystem', ecosystemReal]);
    injectedPointer = true;
  } catch (err) {
    // Rollback partial state.
    if (createdEcosystem && fs.existsSync(ecosystemDir)) {
      try {
        fs.rmSync(ecosystemDir, { recursive: true, force: true });
      } catch (_e) { /* best-effort */ }
    }
    if (injectedPointer) {
      const primary = pointer.findPrimaryInstructionFile(target);
      if (primary) {
        try {
          pointer.stripPointer(path.join(target, primary));
        } catch (_e) { /* best-effort */ }
      }
    }
    throw err;
  } finally {
    process.chdir(cwd0);
  }

  console.log('');
  console.log(`✓ Ecosystem "${ecosystemName}" created at ${ecosystemDir}`);
  console.log(`  This project is registered as the first member.`);
  console.log('');
  console.log('  Add another repo:');
  console.log(`    cd <other-repo> && momentum join ${path.relative(process.cwd(), ecosystemDir) || ecosystemDir}`);
}

async function maybePromptForAutoEcosystem(target) {
  const skipFile = path.join(target, '.momentum', 'skip-ecosystem-prompt');
  if (fs.existsSync(skipFile)) return;

  const parentDir = path.dirname(target);
  let entries;
  try {
    entries = fs.readdirSync(parentDir, { withFileTypes: true });
  } catch (_e) {
    return;
  }

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const candidate = path.join(parentDir, e.name);
    if (candidate === target) continue;
    const manifestPath = path.join(candidate, 'ecosystem.json');
    if (!fs.existsSync(manifestPath)) continue;
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (_err) {
      continue;
    }
    if (!manifest || !manifest.name) continue;

    // Non-interactive: silently skip (no skip-file written; a future
    // interactive session can still prompt).
    if (!process.stdin.isTTY) return;

    const accepted = await promptYesNo(
      `Detected ecosystem "${manifest.name}" at ${path.relative(target, candidate) || candidate}.\n` +
        `Register this project as a member? [y/N] `,
    );
    if (accepted) {
      const { runEcosystem } = require('./ecosystem');
      const cwd0 = process.cwd();
      try {
        process.chdir(target);
        let targetReal = target;
        let candidateReal = candidate;
        try { targetReal = fs.realpathSync(target); } catch (_e) {}
        try { candidateReal = fs.realpathSync(candidate); } catch (_e) {}
        runEcosystem(['add', targetReal, '--ecosystem', candidateReal]);
        console.log(`✓ Registered as a member of "${manifest.name}".`);
      } finally {
        process.chdir(cwd0);
      }
    } else {
      try {
        fs.mkdirSync(path.dirname(skipFile), { recursive: true });
        fs.writeFileSync(skipFile, 'declined at init time\n');
      } catch (_e) { /* best-effort */ }
    }
    return;
  }
}

function promptYesNo(question) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test((answer || '').trim()));
    });
  });
}

// ── Entry point ───────────────────────────────────────────────────────────────

// ── init agent picker (v0.31.0) ──────────────────────────────────────────────
//
// `init` has no default adapter: an install that guesses is worse than one
// that asks. Interactive shells get a numbered picker; non-interactive
// callers (CI, agents, pipes) must pass --agent explicitly.
// MOMENTUM_FORCE_INTERACTIVE=1 lets tests exercise the picker through pipes.
function promptForAgent() {
  const agents = listAvailableAgents();
  const interactive = (process.stdin.isTTY && process.stdout.isTTY)
    || process.env.MOMENTUM_FORCE_INTERACTIVE === '1';
  if (!interactive) {
    console.error('Error: --agent is required when init runs non-interactively.');
    console.error(`Available: ${agents.join(', ')}`);
    console.error(`Example: npx @limina-labs/momentum@latest init --agent ${agents[0] || 'claude-code'}`);
    process.exit(1);
  }
  console.log('\nWhich coding agent should momentum install for?\n');
  agents.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));
  console.log('');
  const readline = require('node:readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    let resolved = false;
    // Piped stdin can end before an answer arrives — treat EOF as "no pick".
    rl.on('close', () => {
      if (!resolved) {
        console.error('\nError: no agent selected.');
        process.exit(1);
      }
    });
    const ask = () => {
      rl.question(`Agent [1-${agents.length}]: `, (answer) => {
        const input = answer.trim();
        // Accept the agent name itself or its 1-based list number.
        const pick = agents.includes(input) ? input : agents[Number(input) - 1];
        if (pick) {
          resolved = true;
          rl.close();
          resolve(pick);
          return;
        }
        console.log(`  Enter 1-${agents.length} or an agent name.`);
        ask();
      });
    };
    ask();
  });
}

async function main() {
  const args = process.argv.slice(2);

  // Reject the deprecated --coding-agent flag with a clear rename message.
  if (args.includes('--coding-agent')) {
    console.error('Error: --coding-agent has been renamed to --agent in v0.6.0.');
    console.error('       Re-run with: --agent <name> (e.g., --agent claude-code)');
    process.exit(1);
  }

  // Extract --agent flag before command dispatch. Remember whether it was
  // explicit: the ecosystem subcommands parse --agent themselves (init's
  // root command surface, upgrade's sweep override — ENH-049), so an
  // explicit flag is re-injected at that dispatch rather than silently
  // swallowed here.
  //
  // The claude-code fallback below serves upgrade/ecosystem paths only —
  // `init` never uses it: since v0.31.0 an omitted --agent makes init ask
  // interactively (or fail fast when there is no TTY to ask on).
  let agent = 'claude-code';
  let agentExplicit = false;
  const agentFlagIdx = args.indexOf('--agent');
  if (agentFlagIdx !== -1) {
    agent = args[agentFlagIdx + 1];
    agentExplicit = true;
    args.splice(agentFlagIdx, 2);
  }

  // --dry-run is parsed per-command (init/upgrade here; `ecosystem upgrade`
  // parses its own) — NOT stripped globally, or the ecosystem sweep would
  // never see it.

  // Start update check concurrently — runs while command executes
  const updateCheckPromise = checkForUpdates();

  let exitCode = 0;

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    usage();
    exitCode = args.length === 0 ? 1 : 0;
  } else if (args[0] === '--version' || args[0] === '-v') {
    console.log(pkg.version);
  } else if (args[0] === 'init') {
    const dryRun = args.includes('--dry-run');
    const initOpts = extractInitFlags(args.filter((a) => a !== '--dry-run'));
    const targetDir = initOpts.target || process.cwd();
    try {
      // v0.31.0: no silent default agent — momentum is multi-adapter, and a
      // hidden claude-code default scaffolds the wrong surface for every
      // other agent's users. Ask when we can, fail fast when we can't.
      if (!agentExplicit) agent = await promptForAgent();
      init(targetDir, agent, { dryRun });
      // Ecosystem auto-detect/scaffold mutates state — skip it on a dry run.
      if (!dryRun) await postInitEcosystem(targetDir, initOpts);
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'upgrade') {
    const dryRun = args.includes('--dry-run');
    const autostash = args.includes('--autostash');
    const targetDir = args.slice(1).find((a) => !a.startsWith('--')) || process.cwd();
    try {
      // Warn (don't block) if the installed CLI is behind the published latest —
      // upgrade can only ever install files as new as the CLI itself.
      const staleWarning = formatStaleCliWarning(pkg.version, await updateCheckPromise);
      if (staleWarning) console.log(staleWarning);
      // --autostash: stash a dirty tree, upgrade, restore. Dry-run writes
      // nothing, so it never needs to stash.
      if (autostash && !dryRun) {
        withAutostash(path.resolve(targetDir), () => upgrade(targetDir, agent, { dryRun }));
      } else {
        upgrade(targetDir, agent, { dryRun });
      }
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'ecosystem') {
    try {
      const { runEcosystem } = require('./ecosystem');
      runEcosystem(
        agentExplicit ? [...args.slice(1), '--agent', agent] : args.slice(1),
      );
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'join') {
    try {
      const { cmdJoin } = require('./state-commands');
      cmdJoin(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'leave') {
    try {
      const { cmdLeave } = require('./state-commands');
      cmdLeave(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'antigravity') {
    try {
      const { runAntigravity } = require('./antigravity');
      runAntigravity(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'doctor') {
    try {
      const { cmdDoctor } = require('./state-commands');
      cmdDoctor(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'scout') {
    try {
      const { cmdScout } = require('./orchestration-commands');
      await cmdScout(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'dispatch') {
    try {
      const { cmdDispatch } = require('./orchestration-commands');
      await cmdDispatch(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'handoff') {
    try {
      const { cmdHandoff } = require('./orchestration-commands');
      await cmdHandoff(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'continue') {
    try {
      const { cmdContinue } = require('./orchestration-commands');
      await cmdContinue(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'swarm') {
    try {
      const { runSwarm } = require('./swarm');
      runSwarm(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'lanes') {
    try {
      const { runLanes } = require('./lanes');
      exitCode = runLanes(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'waves') {
    try {
      const { runWaves } = require('./waves');
      exitCode = runWaves(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'okf') {
    try {
      const { runOkf } = require('./okf');
      exitCode = runOkf(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else {
    console.error(`Unknown command: ${args[0]}`);
    console.error('Run "momentum --help" for usage.');
    exitCode = 1;
  }

  // Show update notice after command output (non-blocking — result from concurrent check)
  try {
    const latestVersion = await updateCheckPromise;
    if (latestVersion) {
      console.log('');
      console.log(`  ┌──────────────────────────────────────────────────────┐`);
      console.log(`  │  Update available: ${pkg.version} → ${latestVersion}`);
      console.log(`  │  Run: npm install -g @limina-labs/momentum@latest`);
      console.log(`  └──────────────────────────────────────────────────────┘`);
      console.log('');
    }
  } catch { /* ignore update check errors */ }

  process.exit(exitCode);
}

module.exports = {
  // Pure helpers (unit-testable)
  partitionByMarker,
  assertNotEcosystemRoot,
  listFilesRecursive,
  detectOverlayConflicts,
  isNewerVersion,
  formatStaleCliWarning,
  gitPorcelain,
  withAutostash,
  MARKER,
  DEFAULT_OVERLAY_DESTS,
  listAvailableAgents,
  formatAvailableAgents,
  // Side-effectful but testable with a tmp dir
  upgradeMarkedFile,
  copyDir,
  copyFile,
  fileExists,
  init,
  upgrade,
};

// Run only when invoked as a CLI, not when required by tests.
// NOTE: exports MUST be assigned above this line — main() dispatches the
// `ecosystem upgrade` sweep synchronously, which require()s this module back;
// if exports weren't set yet, `upgrade` would be undefined (circular require).
if (require.main === module) {
  main();
}
