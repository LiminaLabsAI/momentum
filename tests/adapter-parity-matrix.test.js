'use strict';

/**
 * Phase 16 Rework G0.5 — Adapter Parity Matrix audit.
 *
 * Reads `core/adapter-parity-matrix.md` and asserts:
 *   - Every row has a cell per adapter column
 *   - Every cell declares a known status
 *   - shipped-degraded / not-applicable / shipped-gated / shipped-as-*
 *     cells reference a footnote
 *
 * Silent gaps were the failure mode this audit prevents.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');

const MATRIX_PATH = path.join(REPO_ROOT, 'core', 'adapter-parity-matrix.md');

// Valid status bases: plain shipped, degraded, not-applicable, gated,
// and shipped-as-<other-category> for cross-category mappings.
const VALID_STATUS_RE = /^(shipped(-degraded|-gated|-as-[a-z-]+)?|not-applicable)$/;
const STATUSES_REQUIRING_FOOTNOTE = new Set([
  'shipped-degraded',
  'not-applicable',
  'shipped-gated',
]);

function parseCell(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return { base: null, footnote: false };
  const footnoteRe = /[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g;
  const hasFootnote = footnoteRe.test(trimmed);
  const noFootnote = trimmed.replace(footnoteRe, '').trim();
  const match = noFootnote.match(/^([a-z][a-z-]+)\s*(?:\((.+)\))?\s*$/);
  if (!match) return { base: null, footnote: hasFootnote };
  return { base: match[1], footnote: hasFootnote };
}

function parseMatrixTables(markdown) {
  const lines = markdown.split('\n');
  const tables = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('|') && lines[i + 1] && lines[i + 1].startsWith('|')) {
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
      tables.push({ header: headerCells, rows: dataRows });
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

function isFeatureTable(table, adapterNames) {
  return table.header.some((h) => adapterNames.has(h));
}

test('parity matrix doc exists', () => {
  assert.ok(fs.existsSync(MATRIX_PATH), 'core/adapter-parity-matrix.md must exist');
});

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
    for (const r of t.rows) {
      for (let c = 1; c < r.cells.length; c++) {
        const parsed = parseCell(r.cells[c]);
        assert.ok(
          parsed.base !== null,
          `cell at line ${r.lineNo}, column ${c} ("${r.cells[c]}") is empty/unparseable. Use shipped / shipped-degraded / not-applicable / shipped-gated / shipped-as-<category>.`,
        );
        assert.match(
          parsed.base,
          VALID_STATUS_RE,
          `cell at line ${r.lineNo}, column ${c} status "${parsed.base}" is not a recognized form`,
        );
        if (STATUSES_REQUIRING_FOOTNOTE.has(parsed.base) || parsed.base.startsWith('shipped-as-')) {
          assert.ok(
            parsed.footnote,
            `cell at line ${r.lineNo}, column ${c} is "${parsed.base}" — must reference a footnote (¹²³…) explaining the degradation/cross-category mapping`,
          );
        }
      }
    }
  }
});

test('parity matrix mentions every shipped adapter as a column', () => {
  const doc = fs.readFileSync(MATRIX_PATH, 'utf8');
  const adapterNames = loadAdapterDisplayNames();
  const tables = parseMatrixTables(doc);
  const headerCols = new Set();
  for (const t of tables) {
    for (const h of t.header) headerCols.add(h);
  }
  for (const name of adapterNames) {
    assert.ok(
      headerCols.has(name),
      `parity matrix must have a column for adapter "${name}"`,
    );
  }
});
