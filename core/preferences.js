'use strict';

/**
 * Phase 26 — Project Preferences (ADR-0009).
 *
 * Structured project preferences (`specs/preferences.md`) consumed by recipe
 * templates at execution time, so gate copy, verification/release commands,
 * and the merge flow ADAPT to the actual project instead of hardcoding
 * npm/GitHub/staging-main assumptions.
 *
 * Layers (ADR-0009):
 *   - TRUST LAYER (invariant, non-configurable): human authorization for a
 *     protected-branch push. Enforced in core/git-hooks; NEVER a preference.
 *   - MECHANISMS (preferences): which branches are protected, how far the
 *     agent goes, which commands run.
 *
 * Fail-closed: readPreferences() returns null when the file is absent
 * (recipes keep the current npm/GitHub behavior). A present file with a
 * missing/unknown value resolves to the field default WITH a stderr warning,
 * never to a wrong action.
 *
 * Source of truth = specs/preferences.md (content, version-controlled).
 * Derived cache    = .momentum/preferences-cache.json (gitignored) read by
 * the pre-push hook; falls back to ['main','master','staging'] when missing.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { KNOWN_KEYS, LIST_KEYS, renderPreferencesMarkdown } = require('./preferences-templates');

const PREFS_FILE = 'specs/preferences.md';
const CACHE_FILE = '.momentum/preferences-cache.json';

const DEFAULTS = Object.freeze({
  language: 'none',
  framework: 'none',
  test_command: 'npm test',
  build_command: 'none',
  publish_target: 'none',
  git_forge: 'github',
  release_command: 'none',
  release_flow: 'tag-only',
  end_state: 'merge-after-yes',
  branch_flow: ['staging', 'main'],
  protected_branches: ['staging', 'main'],
});

// Enumerations — a value outside the set resolves to the default + warning.
const ENUMS = {
  language: ['node', 'python', 'rust', 'go', 'dotnet', 'ruby', 'java', 'none'],
  publish_target: ['npm', 'pypi', 'crates-io', 'nuget', 'none', 'custom'],
  git_forge: ['github', 'gitlab', 'bitbucket', 'gitea', 'forgejo', 'bare-ssh'],
  release_flow: ['tag-and-publish', 'tag-and-deploy', 'tag-only', 'custom'],
  end_state: ['merge-after-yes', 'staging-promotion', 'feature-branch-only'],
};

// Fields the CLI can infer from manifests + git remote. Used by drift detection.
const INFERABLE_KEYS = ['language', 'framework', 'publish_target', 'git_forge'];

function warn(msg) {
  try { process.stderr.write(`momentum preferences: ${msg}\n`); } catch { /* no stderr */ }
}

/**
 * Parse a `specs/preferences.md` body into a raw key→value map. Pure.
 * Tolerant: scans every `| key | value |` row; known keys are collected,
 * unknown keys ignored. List keys split on comma. Returns {} for empty /
 * table-less content. Never throws.
 * @param {string} content
 * @returns {Record<string, string|string[]>}
 */
function parsePreferencesMarkdown(content) {
  const out = {};
  if (!content || typeof content !== 'string') return out;
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([A-Za-z0-9_]+)\s*\|\s*(.*?)\s*\|\s*$/);
    if (!m) continue;
    const key = m[1];
    const raw = m[2];
    if (key === 'Key' || /^-{3,}$/.test(raw)) continue; // header / separator
    if (!KNOWN_KEYS.includes(key)) continue;
    out[key] = LIST_KEYS.has(key)
      ? raw.split(',').map((s) => s.trim()).filter(Boolean)
      : raw.trim();
  }
  return out;
}

/**
 * Normalize a raw parsed map into a complete Preferences object: fill defaults
 * for missing keys, validate enums, coerce list shapes. Pure (warning goes to
 * stderr only when `opts.warn` is true — disabled in tests by default).
 * @param {Record<string, string|string[]>} raw
 * @param {object} [opts] { warn: boolean }
 * @returns {object} a fresh Preferences object with every KNOWN_KEYS key set
 */
function normalizePreferences(raw, opts = {}) {
  const doWarn = opts.warn === true;
  const prefs = {};
  for (const key of KNOWN_KEYS) {
    let value = raw && raw[key] !== undefined ? raw[key] : DEFAULTS[key];
    // List keys: coerce to a clean string array.
    if (LIST_KEYS.has(key)) {
      if (typeof value === 'string') {
        value = value.split(',').map((s) => s.trim()).filter(Boolean);
      } else if (!Array.isArray(value)) {
        value = [];
      }
      if (value.length === 0) {
        if (doWarn && raw && raw[key] !== undefined) warn(`empty '${key}' — using default`);
        value = DEFAULTS[key];
      }
    } else {
      value = String(value).trim();
      const allowed = ENUMS[key];
      if (allowed && !allowed.includes(value)) {
        if (doWarn && value !== '' && value !== DEFAULTS[key]) {
          warn(`unknown '${key}' value '${value}' — using default '${DEFAULTS[key]}'`);
        }
        value = DEFAULTS[key];
      }
      if (value === '' && !allowed) value = DEFAULTS[key]; // empty non-enum scalar → default
    }
    prefs[key] = value;
  }
  return prefs;
}

/**
 * Read + parse `specs/preferences.md`. Returns null when the file is absent
 * (recipes keep the current npm/GitHub behavior). A present file is
 * normalized (missing/unknown values → default + stderr warning).
 * @param {string} specsDir  absolute path to the project's specs/ directory
 * @returns {object|null}
 */
function readPreferences(specsDir) {
  const file = path.join(specsDir, 'preferences.md');
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  return normalizePreferences(parsePreferencesMarkdown(content), { warn: true });
}

/**
 * Render + write `specs/preferences.md`. Creates the parent dir if needed.
 * @param {string} specsDir
 * @param {object} prefs   normalized Preferences object
 * @param {object} [opts]  passed through to renderPreferencesMarkdown
 * @returns {string} the written file path
 */
function writePreferences(specsDir, prefs, opts = {}) {
  const file = path.join(specsDir, 'preferences.md');
  fs.mkdirSync(specsDir, { recursive: true });
  const body = renderPreferencesMarkdown(prefs, opts);
  fs.writeFileSync(file, body);
  return file;
}

// ── pure inference helpers ────────────────────────────────────────────────────

/**
 * Infer the project language from manifest file presence.
 * @param {object} manifests  { packageJson, pyproject, setupPy, requirements, cargo, goMod, csproj, gemfile, pom, gradle } — each truthy when present
 * @returns {string}
 */
function inferLanguage(manifests) {
  if (manifests.packageJson) return 'node';
  if (manifests.pyproject || manifests.setupPy || manifests.requirements) return 'python';
  if (manifests.cargo) return 'rust';
  if (manifests.goMod) return 'go';
  if (manifests.csproj) return 'dotnet';
  if (manifests.gemfile) return 'ruby';
  if (manifests.pom || manifests.gradle) return 'java';
  return 'none';
}

/**
 * Infer the git forge from a remote URL. Pure.
 * github.com → github; gitlab.com → gitlab; bitbucket.org → bitbucket;
 * a URL containing 'gitea' or 'forgejo' → gitea; bare ssh (no host) → bare-ssh;
 * anything else → github (the historical default).
 * @param {string} url
 * @returns {string}
 */
function inferForge(url) {
  const u = String(url || '').toLowerCase();
  if (!u) return 'github';
  if (u.includes('github.com')) return 'github';
  if (u.includes('gitlab.com')) return 'gitlab';
  if (u.includes('bitbucket.org')) return 'bitbucket';
  if (u.includes('forgejo')) return 'forgejo';
  if (u.includes('gitea')) return 'gitea';
  // ssh bare remotes like git@host:org/repo or host:org/repo with no .com TLD
  if (/^[^@\s]+@[^:]+:|^git:\/\//.test(u)) return 'bare-ssh';
  return 'github';
}

/**
 * Infer test/build/publish/release commands + release_flow from the language
 * (+ package.json scripts for node). Pure.
 * @param {string} language
 * @param {object} [pkg]  parsed package.json ({ scripts: {} })
 * @returns {{test_command:string,build_command:string,publish_target:string,release_flow:string}}
 */
function inferCommands(language, pkg) {
  const scripts = (pkg && pkg.scripts) || {};
  switch (language) {
    case 'node':
      return {
        test_command: scripts.test ? 'npm test' : 'npm test',
        build_command: scripts.build ? 'npm run build' : 'none',
        publish_target: 'npm',
        release_flow: 'tag-and-publish',
      };
    case 'python':
      return { test_command: 'pytest', build_command: 'none', publish_target: 'pypi', release_flow: 'tag-and-publish' };
    case 'rust':
      return { test_command: 'cargo test', build_command: 'cargo build --release', publish_target: 'crates-io', release_flow: 'tag-and-publish' };
    case 'go':
      return { test_command: 'go test ./...', build_command: 'go build', publish_target: 'none', release_flow: 'tag-only' };
    case 'dotnet':
      return { test_command: 'dotnet test', build_command: 'dotnet build', publish_target: 'nuget', release_flow: 'tag-and-publish' };
    case 'ruby':
      return { test_command: 'rspec', build_command: 'none', publish_target: 'none', release_flow: 'tag-only' };
    case 'java':
      return { test_command: 'mvn test', build_command: 'mvn package', publish_target: 'none', release_flow: 'tag-only' };
    default:
      return { test_command: 'npm test', build_command: 'none', publish_target: 'none', release_flow: 'tag-only' };
  }
}

const FORGE_RELEASE_COMMAND = {
  github: 'gh release create',
  gitlab: 'glab release create',
  bitbucket: 'none',
  gitea: 'tea release create',
  forgejo: 'tea release create',
  'bare-ssh': 'none',
};

/**
 * Infer a framework string from package.json dependencies. Pure.
 * @param {object} [pkg]
 * @returns {string}
 */
function inferFramework(pkg) {
  const deps = { ...(pkg && pkg.dependencies), ...(pkg && pkg.devDependencies) };
  if (!deps) return 'none';
  if (deps.next) return 'nextjs';
  if (deps.astro) return 'astro';
  if (deps.fastapi) return 'fastapi';
  if (deps.actix_web) return 'actix';
  return 'none';
}

// ── fs-bound inference ────────────────────────────────────────────────────────

function readJsonIfExists(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function hasCsproj(dir) {
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isFile() && e.name.toLowerCase().endsWith('.csproj')) return true;
    }
  } catch { /* ignore */ }
  return false;
}

/**
 * Infer a full Preferences object from the target dir's manifests + git remote.
 * @param {string} targetDir  project root
 * @param {object} [opts]  { remoteUrl?: string } — override the git remote lookup (tests)
 * @returns {object} a normalized Preferences object (all KNOWN_KEYS set)
 */
function inferPreferences(targetDir, opts = {}) {
  const manifests = {
    packageJson: !!readJsonIfExists(path.join(targetDir, 'package.json')),
    pyproject: fs.existsSync(path.join(targetDir, 'pyproject.toml')),
    setupPy: fs.existsSync(path.join(targetDir, 'setup.py')),
    requirements: fs.existsSync(path.join(targetDir, 'requirements.txt')),
    cargo: fs.existsSync(path.join(targetDir, 'Cargo.toml')),
    goMod: fs.existsSync(path.join(targetDir, 'go.mod')),
    csproj: hasCsproj(targetDir),
    gemfile: fs.existsSync(path.join(targetDir, 'Gemfile')),
    pom: fs.existsSync(path.join(targetDir, 'pom.xml')),
    gradle: fs.existsSync(path.join(targetDir, 'build.gradle')) || fs.existsSync(path.join(targetDir, 'build.gradle.kts')),
  };
  const pkg = readJsonIfExists(path.join(targetDir, 'package.json')) || {};
  const language = inferLanguage(manifests);
  const framework = language === 'node' ? inferFramework(pkg) : 'none';
  const cmds = inferCommands(language, pkg);

  let remoteUrl = opts.remoteUrl;
  if (remoteUrl === undefined) {
    try {
      const r = spawnSync('git', ['-C', targetDir, 'remote', 'get-url', 'origin'], { encoding: 'utf8' });
      remoteUrl = (r && r.status === 0) ? r.stdout.trim() : '';
    } catch {
      remoteUrl = '';
    }
  }
  const gitForge = inferForge(remoteUrl);
  const releaseCommand = FORGE_RELEASE_COMMAND[gitForge] || 'none';
  const branchFlow = DEFAULTS.branch_flow;

  const prefs = {
    language,
    framework,
    test_command: cmds.test_command,
    build_command: cmds.build_command,
    publish_target: cmds.publish_target,
    git_forge: gitForge,
    release_command: releaseCommand,
    release_flow: cmds.release_flow,
    end_state: DEFAULTS.end_state,
    branch_flow: branchFlow.slice(),
    protected_branches: deriveProtectedBranches(branchFlow),
  };
  return prefs;
}

/**
 * Derive the protected-branch list from a branch_flow. Per ADR-0009, every
 * entry in the promotion sequence is protected (the agent may not push to any
 * of them without the approval sentinel).
 * @param {string[]} branchFlow
 * @returns {string[]}
 */
function deriveProtectedBranches(branchFlow) {
  if (!Array.isArray(branchFlow)) return DEFAULTS.protected_branches.slice();
  const clean = branchFlow.map((b) => String(b).trim()).filter(Boolean);
  return clean.length ? clean : DEFAULTS.protected_branches.slice();
}

// ── cache (derived build artifact for the pre-push hook) ──────────────────────

/**
 * Write `.momentum/preferences-cache.json` (gitignored). The pre-push hook
 * reads `protected_branches` from here, falling back to
 * ['main','master','staging'] when the cache is missing.
 * @param {string} rootDir  repo root (where .momentum/ lives)
 * @param {object} prefs
 */
function writePreferencesCache(rootDir, prefs) {
  const dir = path.join(rootDir, '.momentum');
  fs.mkdirSync(dir, { recursive: true });
  const cache = {
    version: 1,
    generatedAt: new Date().toISOString(),
    protected_branches: prefs.protected_branches || deriveProtectedBranches(prefs.branch_flow),
    branch_flow: prefs.branch_flow || [],
    end_state: prefs.end_state || DEFAULTS.end_state,
  };
  fs.writeFileSync(path.join(dir, 'preferences-cache.json'), JSON.stringify(cache, null, 2) + '\n');
  return path.join(dir, 'preferences-cache.json');
}

/**
 * Read `.momentum/preferences-cache.json`. Returns null when absent or
 * unparseable (callers fall back to the hardcoded default list).
 * @param {string} rootDir
 * @returns {object|null}
 */
function readPreferencesCache(rootDir) {
  const file = path.join(rootDir, '.momentum', 'preferences-cache.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// ── founded predicate (ADR-0008) ──────────────────────────────────────────────

/**
 * True when the project is founded (charter + roadmap both exist). Preferences
 * are migrated by `momentum upgrade` only for founded projects.
 * @param {string} targetDir
 * @returns {boolean}
 */
function isFounded(targetDir) {
  return fs.existsSync(path.join(targetDir, 'specs', 'vision', 'project-charter.md'))
    && fs.existsSync(path.join(targetDir, 'specs', 'planning', 'roadmap.md'));
}

module.exports = {
  PREFS_FILE,
  CACHE_FILE,
  KNOWN_KEYS,
  LIST_KEYS,
  DEFAULTS,
  ENUMS,
  INFERABLE_KEYS,
  parsePreferencesMarkdown,
  normalizePreferences,
  readPreferences,
  writePreferences,
  renderPreferencesMarkdown,
  inferLanguage,
  inferForge,
  inferFramework,
  inferCommands,
  inferPreferences,
  deriveProtectedBranches,
  writePreferencesCache,
  readPreferencesCache,
  isFounded,
  FORGE_RELEASE_COMMAND,
};
