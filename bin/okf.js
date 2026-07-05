#!/usr/bin/env node
'use strict';

/**
 * `momentum okf` — OKF v0.1 bundle utilities (Phase 24, ADR-0005).
 *
 *   momentum okf check [dir]   conformance report for <dir>/specs
 *   momentum okf index [dir]   regenerate bundle indexes (root/phases/decisions)
 *
 * The migration itself runs inside `momentum upgrade`.
 */

const fs = require('fs');
const path = require('path');

const okf = require('../core/lib/okf-migrate');

function usage() {
  console.log(`momentum okf — Open Knowledge Format (v${okf.OKF_VERSION}) bundle utilities

  momentum okf check [dir]   conformance report for <dir>/specs (exit 1 on violations)
  momentum okf index [dir]   regenerate specs/index.md + phases/ + decisions/ listings

  Migration of legacy JSON state (phases/index.json, decisions/impact-map.json)
  runs as part of \`momentum upgrade\`.`);
}

function runOkf(args) {
  const sub = args[0];
  if (!sub || sub === '--help' || sub === '-h' || sub === 'help') {
    usage();
    return sub ? 0 : 1;
  }
  const target = path.resolve(args[1] || process.cwd());

  if (sub === 'check') {
    const report = okf.check(target);
    if (!report.applicable) {
      console.error(`✗ no specs/ directory at ${target}`);
      return 1;
    }
    for (const w of report.warnings) console.error(`  ⚠ ${w}`);
    if (report.violations.length) {
      console.log(`OKF v${okf.OKF_VERSION} conformance: ${path.join(target, 'specs')}`);
      for (const v of report.violations) console.log(`  ✗ ${v.rel} — ${v.problem}`);
      console.log(`✗ ${report.violations.length} violation(s) across ${report.files} markdown file(s)`);
      return 1;
    }
    console.log(`✓ specs/ is an OKF v${okf.OKF_VERSION} conformant bundle (${report.files} markdown file(s))`);
    return 0;
  }

  if (sub === 'index') {
    if (!fs.existsSync(path.join(target, 'specs'))) {
      console.error(`✗ no specs/ directory at ${target}`);
      return 1;
    }
    const changed = okf.generateIndexes(target);
    if (!changed.length) {
      console.log('= bundle indexes up to date');
    } else {
      for (const rel of changed) console.log(`✓ wrote specs/${rel}`);
    }
    return 0;
  }

  console.error(`Unknown okf subcommand: ${sub}`);
  console.error('Run "momentum okf help" for usage.');
  return 1;
}

module.exports = { runOkf };
