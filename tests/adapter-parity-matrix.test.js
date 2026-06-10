'use strict';

/**
 * Phase 16 G0.4 — Adapter Parity Matrix audit.
 *
 * Reads `core/adapter-parity-matrix.md` and asserts:
 *   - Every row has a cell per adapter column.
 *   - Every cell declares a known status (shipped / shipped-degraded /
 *     not-applicable), optionally with a parenthetical note.
 *   - Every shipped-degraded or not-applicable cell references a
 *     footnote so the degradation is documented in-doc.
 *
 * Silent gaps in the matrix were the failure mode this audit prevents.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');

const MATRIX_PATH = path.join(REPO_ROOT, 'core', 'adapter-parity-matrix.md');

const VALID_STATUSES = new Set([
  'shipped',
  'shipped-degraded',
  'not-applicable',
]);

// Cell shapes accepted (in any order):
//   shipped
//   shipped¹
//   shipped (Phase 16 G1.5)
//   shipped¹ (Phase 16 G2)
//   shipped-degraded²
//   not-applicable⁵
function parseCell(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return { base: null, trailing: '', footnote: false };
  // Strip footnote markers wherever they appear in the cell.
  const footnoteRegex = /[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g;
  const hasFootnote = footnoteRegex.test(trimmed);
  const noFootnote = trimmed.replace(footnoteRegex, '').trim();
  // Either "shipped" or "shipped (Phase 16 G1.5)" after footnote strip.
  const match = noFootnote.match(/^([a-z][a-z-]+)\s*(?:\((.+)\))?\s*$/);
  if (!match) return { base: null, trailing: '', footnote: hasFootnote };
  return {
    base: match[1],
    trailing: match[2] || '',
    footnote: hasFootnote,
  };
}

function parseMatrixTables(markdown) {
  const lines = markdown.split('\n');
  const tables = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('|') && lines[i + 1] && lines[i + 1].startsWith('|')) {
      // Header row + separator row → start of a table.
      const headerCells = splitRow(lines[i]);
      const sepRow = lines[i + 1];
      if (!isSeparatorRow(sepRow)) {
        i++;
        continue;
      }
      const dataRows = [];
      let j = i + 2;
      while (j < lines.length && lines[j].startsWith('|')) {
        dataRows.push({ raw: lines[j], cells: splitRow(lines[j]), lineNo: j + 1 });
        j++;
      }
      tables.push({ header: headerCells, rows: dataRows, startLine: i + 1 });
      i = j;
    } else {
      i++;
    }
  }
  return tables;
}

function isSeparatorRow(row) {
  return /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(row.trim());
}

function splitRow(row) {
  return row
    .replace(/^\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());
}

test('parity matrix doc exists', () => {
  assert.ok(fs.existsSync(MATRIX_PATH), 'core/adapter-parity-matrix.md must exist');
});

// A feature × adapter table is one whose header includes at least one
// adapter display name. The status-legend / `destinations` reference
// tables don't count and are skipped.
function isFeatureTable(table, adapterDisplayNames) {
  return table.header.some((h) => adapterDisplayNames.has(h));
}

function loadAdapterDisplayNames() {
  const adaptersDir = path.join(REPO_ROOT, 'adapters');
  const names = new Set();
  for (const entry of fs.readdirSync(adaptersDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const adapterPath = path.join(adaptersDir, entry.name, 'adapter.js');
    if (!fs.existsSync(adapterPath)) continue;
    const adapter = require(adapterPath);
    names.add(adapter.displayName || entry.name);
  }
  return names;
}

test('every parity-matrix row has full column coverage', () => {
  const doc = fs.readFileSync(MATRIX_PATH, 'utf8');
  const tables = parseMatrixTables(doc);
  const adapterNames = loadAdapterDisplayNames();
  const featureTables = tables.filter((t) => isFeatureTable(t, adapterNames));
  assert.ok(featureTables.length >= 1, 'matrix must contain at least one feature × adapter table');
  for (const t of featureTables) {
    for (const r of t.rows) {
      assert.strictEqual(
        r.cells.length,
        t.header.length,
        `row at line ${r.lineNo} has ${r.cells.length} cells; header has ${t.header.length}: ${r.raw}`,
      );
    }
  }
});

test('every parity-matrix data cell declares a valid status', () => {
  const doc = fs.readFileSync(MATRIX_PATH, 'utf8');
  const tables = parseMatrixTables(doc);
  const adapterNames = loadAdapterDisplayNames();
  for (const t of tables.filter((tt) => isFeatureTable(tt, adapterNames))) {
    // first cell is the feature label; subsequent cells are adapter statuses
    for (const r of t.rows) {
      for (let c = 1; c < r.cells.length; c++) {
        const parsed = parseCell(r.cells[c]);
        assert.ok(
          parsed.base !== null,
          `cell at line ${r.lineNo}, column ${c} ("${r.cells[c]}") is empty or unparseable. ` +
            `Use one of: shipped / shipped-degraded / not-applicable (optionally with parenthetical detail and a footnote marker).`,
        );
        assert.ok(
          VALID_STATUSES.has(parsed.base),
          `cell at line ${r.lineNo}, column ${c} status "${parsed.base}" is not one of ${[...VALID_STATUSES].join(', ')}`,
        );
        if (parsed.base !== 'shipped') {
          assert.ok(
            parsed.footnote,
            `cell at line ${r.lineNo}, column ${c} is "${parsed.base}" — must include a footnote marker (¹²³…) referencing the explanatory footnote.`,
          );
        }
      }
    }
  }
});

test('parity matrix mentions every shipped adapter as a column', () => {
  const doc = fs.readFileSync(MATRIX_PATH, 'utf8');
  const adaptersDir = path.join(REPO_ROOT, 'adapters');
  const adapters = fs
    .readdirSync(adaptersDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((n) => fs.existsSync(path.join(adaptersDir, n, 'adapter.js')));
  const tables = parseMatrixTables(doc);
  const headerCols = new Set();
  for (const t of tables) {
    for (const h of t.header) headerCols.add(h);
  }
  for (const name of adapters) {
    const adapter = require(path.join(adaptersDir, name, 'adapter.js'));
    const display = adapter.displayName || name;
    assert.ok(
      headerCols.has(display) || headerCols.has(name),
      `parity matrix must have a column for adapter "${display}" (${name})`,
    );
  }
});
