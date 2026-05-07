'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { partitionByMarker, upgradeMarkedFile, MARKER } = require('../bin/momentum.js');
const { mktmp, rmrf, write, read } = require('./_helpers');

test('partitionByMarker — no marker returns full content as managed', () => {
  const content = '# Title\n\nbody text\n';
  const { managed, extensions } = partitionByMarker(content);
  assert.equal(managed, content);
  assert.equal(extensions, null);
});

test('partitionByMarker — with marker splits losslessly', () => {
  const content =
    '# Title\n\nmanaged body\n\n## Project Extensions\n\nuser content\nmore\n';
  const { managed, extensions } = partitionByMarker(content);
  assert.equal(managed + extensions, content);
  assert.match(extensions, /^\n## Project Extensions/);
});

test('partitionByMarker — round-trip preserves trailing whitespace', () => {
  // Regression: Phase-5 bug where trailing-whitespace stripping made the
  // round-trip lossy and a no-op upgrade reported "updated".
  const content =
    'managed line\n\n## Project Extensions\n\next line\n\n\n';
  const { managed, extensions } = partitionByMarker(content);
  assert.equal(managed + extensions, content);
});

test('upgradeMarkedFile — added when destination is missing', () => {
  const tmp = mktmp();
  try {
    const src = path.join(tmp, 'src.md');
    const dest = path.join(tmp, 'dest.md');
    write(src, `managed\n\n${MARKER}\n\ndefault ext\n`);
    const result = upgradeMarkedFile(src, dest, 'test', tmp);
    assert.equal(result, 'added');
    assert.equal(read(dest), `managed\n\n${MARKER}\n\ndefault ext\n`);
  } finally { rmrf(tmp); }
});

test('upgradeMarkedFile — unchanged when src+dest produce identical content', () => {
  const tmp = mktmp();
  try {
    const src = path.join(tmp, 'src.md');
    const dest = path.join(tmp, 'dest.md');
    const body = `managed\n\n${MARKER}\n\next\n`;
    write(src, body);
    write(dest, body);
    const result = upgradeMarkedFile(src, dest, 'test', tmp);
    assert.equal(result, 'unchanged');
    assert.equal(read(dest), body);
    assert.equal(fs.existsSync(dest + '.bak'), false);
  } finally { rmrf(tmp); }
});

test('upgradeMarkedFile — updated preserves user extensions byte-for-byte', () => {
  const tmp = mktmp();
  try {
    const src = path.join(tmp, 'src.md');
    const dest = path.join(tmp, 'dest.md');
    write(src, `managed v2\n\n${MARKER}\n\ndefault ext\n`);
    write(dest, `managed v1\n\n${MARKER}\n\nUSER CONTENT here\n`);
    const result = upgradeMarkedFile(src, dest, 'test', tmp);
    assert.equal(result, 'updated');
    const written = read(dest);
    assert.match(written, /^managed v2/);
    assert.match(written, /USER CONTENT here/);
    assert.equal(fs.existsSync(dest + '.bak'), true);
  } finally { rmrf(tmp); }
});

test('upgradeMarkedFile — migrated handles pre-marker dest with .bak + appended content', () => {
  const tmp = mktmp();
  try {
    const src = path.join(tmp, 'src.md');
    const dest = path.join(tmp, 'dest.md');
    write(src, `managed\n\n${MARKER}\n\ndefault ext\n`);
    write(dest, 'OLD CONTENT no marker here\n');
    const result = upgradeMarkedFile(src, dest, 'test', tmp);
    assert.equal(result, 'migrated');
    const written = read(dest);
    assert.match(written, /managed/);
    assert.match(written, /migrated from pre-marker version on \d{4}-\d{2}-\d{2}/);
    assert.match(written, /OLD CONTENT no marker here/);
    assert.equal(fs.existsSync(dest + '.bak'), true);
    assert.equal(read(dest + '.bak'), 'OLD CONTENT no marker here\n');
  } finally { rmrf(tmp); }
});

test('upgradeMarkedFile — migrated does NOT produce double-marker', () => {
  // Regression: Phase-5 bug where srcParts.managed + MARKER + destParts.extensions
  // produced "## Project Extensions## Project Extensions" on the same line.
  const tmp = mktmp();
  try {
    const src = path.join(tmp, 'src.md');
    const dest = path.join(tmp, 'dest.md');
    write(src, `managed\n\n${MARKER}\n\ndefault ext\n`);
    write(dest, 'pre-marker content\n');
    upgradeMarkedFile(src, dest, 'test', tmp);
    const written = read(dest);
    const markerCount = (written.match(/## Project Extensions/g) || []).length;
    assert.equal(markerCount, 1, `expected exactly one marker, got ${markerCount}`);
  } finally { rmrf(tmp); }
});
