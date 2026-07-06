'use strict';

// Phase 20 follow-up — `momentum upgrade` additively refreshes `.gitignore`.
// Root cause from the cerebrio fleet: upgrade left an old `.gitignore` untouched,
// so repos predating the `._*` / `.momentum/*` rules stayed polluted (fatal on
// exFAT). Fix: append any missing momentum/OS rules, never removing user lines.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, read, write } = require('./_helpers');

const MOMENTUM_RULES = ['._*', '.DS_Store', '.momentum/*', '!.momentum/installed.json', '.claude/worktrees/'];

test('upgrade — appends missing momentum/OS rules to an old .gitignore (with .bak)', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    write(path.join(target, '.gitignore'), 'node_modules/\n*.log\n'); // stale, pre-Phase-20

    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /\.gitignore:\s+updated/);

    const gi = read(path.join(target, '.gitignore'));
    for (const rule of MOMENTUM_RULES) {
      assert.ok(gi.split('\n').map((l) => l.trim()).includes(rule), `missing rule: ${rule}`);
    }
    assert.match(gi, /node_modules\//, 'user line preserved');
    assert.match(gi, /\*\.log/, 'user line preserved');
    assert.ok(fs.existsSync(path.join(target, '.gitignore.bak')), '.bak saved');
  } finally {
    rmrf(target);
  }
});

test('upgrade — .gitignore refresh is idempotent (re-run appends nothing)', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    write(path.join(target, '.gitignore'), 'node_modules/\n');
    runCli(['upgrade', target]);
    const after1 = read(path.join(target, '.gitignore'));

    const res = runCli(['upgrade', target]);
    assert.match(res.stdout, /\.gitignore:\s+unchanged/);
    assert.equal(read(path.join(target, '.gitignore')), after1, 'no further changes on re-run');
  } finally {
    rmrf(target);
  }
});

test('upgrade — .gitignore is never recorded as a managed file (not orphan-eligible)', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    write(path.join(target, '.gitignore'), 'node_modules/\n');
    runCli(['upgrade', target]);
    const m = JSON.parse(read(path.join(target, '.momentum', 'installed.json')));
    const allManaged = Object.values(m.agents).flatMap((a) => a.files);
    assert.ok(!allManaged.includes('.gitignore'), '.gitignore must not be managed');
  } finally {
    rmrf(target);
  }
});

test('upgrade --dry-run — does not modify .gitignore', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    write(path.join(target, '.gitignore'), 'node_modules/\n');
    const before = read(path.join(target, '.gitignore'));

    const res = runCli(['upgrade', target, '--dry-run']);
    assert.match(res.stdout, /would append .* \.gitignore|\.gitignore/);
    assert.equal(read(path.join(target, '.gitignore')), before, 'dry-run must not write');
    assert.ok(!fs.existsSync(path.join(target, '.gitignore.bak')), 'dry-run makes no .bak');
  } finally {
    rmrf(target);
  }
});

// BUG-014 — a pre-Phase-20 directory-level `.momentum/` rule defeats the
// appended `!.momentum/installed.json`: git cannot re-include a file under an
// ignored DIRECTORY, so the D1 lock file stays silently ignored while upgrade
// reports success. Fix: `refreshGitignore` comments the legacy rule out in
// place (content preserved) before appending the correct `.momentum/*` pair.

test('upgrade — comments out a legacy .momentum/ dir rule so the lock-file negation takes effect (BUG-014)', () => {
  const target = mktmp();
  try {
    execSync('git init -q', { cwd: target });
    runCli(['init', target]);
    // Recreate a pre-Phase-20 .gitignore: directory-level rule, no negation.
    write(path.join(target, '.gitignore'), 'node_modules/\n.momentum/\n*.log\n');
    fs.writeFileSync(path.join(target, '.momentum', 'other-file'), '');

    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /\.gitignore:\s+updated/);

    const gi = read(path.join(target, '.gitignore'));
    const lines = gi.split('\n').map((l) => l.trim());
    assert.ok(!lines.includes('.momentum/'), 'legacy dir rule must no longer be active');
    assert.ok(
      lines.some((l) => l.startsWith('#') && l.includes('.momentum/') && l.includes('BUG-014')),
      'legacy dir rule commented out in place with explanation'
    );
    assert.ok(lines.includes('.momentum/*'), 'modern contents rule appended');
    assert.ok(lines.includes('!.momentum/installed.json'), 'lock-file negation appended');
    assert.match(gi, /node_modules\//, 'user line preserved');
    assert.match(gi, /\*\.log/, 'user line preserved');
    assert.ok(fs.existsSync(path.join(target, '.gitignore.bak')), '.bak saved');

    // The real proof: ask git itself (check-ignore exits 0 = ignored, 1 = not).
    const ignored = (rel) => {
      try {
        execSync(`git check-ignore -q ${rel}`, { cwd: target });
        return true;
      } catch {
        return false;
      }
    };
    assert.equal(ignored('.momentum/installed.json'), false, 'lock file must be committable after upgrade');
    assert.equal(ignored('.momentum/other-file'), true, 'other .momentum contents must stay ignored');
  } finally {
    rmrf(target);
  }
});

test('upgrade — legacy .momentum/ neutralization is idempotent (re-run changes nothing)', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    write(path.join(target, '.gitignore'), '.momentum/\n');
    runCli(['upgrade', target]);
    const after1 = read(path.join(target, '.gitignore'));

    const res = runCli(['upgrade', target]);
    assert.match(res.stdout, /\.gitignore:\s+unchanged/);
    assert.equal(read(path.join(target, '.gitignore')), after1, 'no further changes on re-run');
  } finally {
    rmrf(target);
  }
});

test('upgrade --dry-run — reports the legacy .momentum/ rule but leaves .gitignore byte-identical (BUG-014)', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    write(path.join(target, '.gitignore'), 'node_modules/\n.momentum/\n');
    const before = read(path.join(target, '.gitignore'));

    const res = runCli(['upgrade', target, '--dry-run']);
    assert.match(res.stdout, /would comment out 1 legacy \.momentum\/ dir rule/);
    assert.equal(read(path.join(target, '.gitignore')), before, 'dry-run must not write');
    assert.ok(!fs.existsSync(path.join(target, '.gitignore.bak')), 'dry-run makes no .bak');
  } finally {
    rmrf(target);
  }
});

test('upgrade — modern .momentum/* rule and negation are NOT commented (BUG-014 scope guard)', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    write(
      path.join(target, '.gitignore'),
      '# keep momentum state out\n.momentum/*\n!.momentum/installed.json\n'
    );
    runCli(['upgrade', target]);

    const lines = read(path.join(target, '.gitignore')).split('\n').map((l) => l.trim());
    assert.ok(lines.includes('.momentum/*'), '.momentum/* must stay active (not commented)');
    assert.ok(lines.includes('!.momentum/installed.json'), 'negation must stay active (not commented)');
    assert.ok(lines.includes('# keep momentum state out'), 'user comment untouched');
    assert.ok(
      !lines.some((l) => l.includes('BUG-014')),
      'no legacy rule present, so nothing gets the BUG-014 treatment'
    );
  } finally {
    rmrf(target);
  }
});
