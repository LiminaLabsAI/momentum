'use strict';

// momentum antigravity <subcommand> — Antigravity-specific utilities.
//
// Phase 22b G3 (ADR-0005). The only subcommand today is `plugin-pack`:
// assembles momentum's skills into a native Antigravity PLUGIN bundle
// (`plugins/<name>/plugin.json` + `skills/`, per the vendor plugin layout —
// fact-sheet §6). Two targets:
//
//   momentum antigravity plugin-pack             → <cwd>/.agents/plugins/momentum/
//   momentum antigravity plugin-pack --global    → ~/.gemini/config/plugins/momentum/
//
// The --global form is the explicit OPT-IN way to get momentum's skills in
// every Antigravity workspace on this machine (global discovery root,
// priority below workspace files — a project-level install always wins).
// Hooks are deliberately NOT packed: plugin hooks run with CWD = the
// plugin's own directory, so momentum's project-relative hook commands only
// make sense installed per-project by `momentum init/upgrade`.
//
// momentum never installs or provisions the `agy` binary itself — see the
// VAL-002 adjudication (specs/adhoc/feat-VAL-002-antigravity-compatibility/).

const fs = require('fs');
const path = require('path');
const os = require('os');

const PLUGIN_NAME = 'momentum';

function copyDirRecursive(src, dest, dryRun, log) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (!dryRun) fs.mkdirSync(d, { recursive: true });
      copyDirRecursive(s, d, dryRun, log);
    } else {
      if (!dryRun) {
        fs.mkdirSync(path.dirname(d), { recursive: true });
        fs.copyFileSync(s, d);
      }
      log.push(d);
    }
  }
}

function cmdPluginPack(args) {
  const global = args.includes('--global');
  const dryRun = args.includes('--dry-run');
  const positional = args.filter((a) => !a.startsWith('--'));

  const skillsSrc = path.join(__dirname, '..', 'adapters', 'antigravity', 'skills');
  if (!fs.existsSync(skillsSrc)) {
    throw new Error(`antigravity skills source not found at ${skillsSrc}`);
  }

  const home = process.env.MOMENTUM_HOME_OVERRIDE || os.homedir();
  const base = global
    ? path.join(home, '.gemini', 'config', 'plugins', PLUGIN_NAME)
    : path.join(path.resolve(positional[0] || process.cwd()), '.agents', 'plugins', PLUGIN_NAME);

  console.log(`→ Packing momentum as an Antigravity plugin${dryRun ? ' (dry-run)' : ''}...`);
  console.log(`  target: ${base}`);

  const written = [];
  const manifestPath = path.join(base, 'plugin.json');
  if (!dryRun) {
    fs.mkdirSync(base, { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify({ name: PLUGIN_NAME }, null, 2) + '\n');
  }
  written.push(manifestPath);
  copyDirRecursive(skillsSrc, path.join(base, 'skills'), dryRun, written);

  for (const f of written) {
    console.log(`  ${dryRun ? '✋ would write' : '+ wrote'}: ${path.relative(path.dirname(base), f)}`);
  }
  console.log('');
  console.log(`  ✓ plugin ${dryRun ? 'planned' : 'packed'} (${written.length} files).`);
  console.log(`  Validate: agy plugin validate "${base}"`);
  if (global) {
    console.log('  Global plugins apply to every Antigravity workspace on this machine;');
    console.log('  a per-project momentum install always takes priority.');
  }
  return base;
}

function usage() {
  console.log('Usage: momentum antigravity <subcommand>');
  console.log('');
  console.log('Subcommands:');
  console.log('  plugin-pack [target] [--global] [--dry-run]');
  console.log('      Assemble momentum skills as a native Antigravity plugin at');
  console.log('      <target>/.agents/plugins/momentum/ (or the global discovery');
  console.log('      root ~/.gemini/config/plugins/momentum/ with --global).');
}

function runAntigravity(args) {
  const sub = args[0];
  if (!sub || sub === 'help' || sub === '--help') {
    usage();
    return;
  }
  if (sub === 'plugin-pack') {
    cmdPluginPack(args.slice(1));
    return;
  }
  console.error(`Unknown antigravity subcommand: ${sub}`);
  usage();
  process.exit(1);
}

module.exports = { runAntigravity, cmdPluginPack };
