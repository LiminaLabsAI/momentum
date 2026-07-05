'use strict';

/**
 * Zero-dependency YAML-frontmatter subset parser/serializer (OKF v0.1).
 *
 * Momentum only ever EMITS this subset, so it only PARSES this subset:
 *   - string scalars:        key: value | key: "value" | key: 'value'
 *   - inline string lists:   key: [a, b, "c d"]
 *   - block string lists:    key:\n  - a\n  - b
 *   - empty scalars:         key:
 *
 * Reads are tolerant per the OKF conformance rules: anything outside the
 * subset (nested maps, multi-line scalars, tabs) makes parse() return
 * `data: null` — callers treat the file as opaque and leave it alone.
 * parse() never throws. Round-trips preserve unknown keys and key order.
 */

const OPEN = /^---\r?\n/;

/** True when content begins with a `---` frontmatter fence. */
function hasBlock(content) {
  return typeof content === 'string' && OPEN.test(content);
}

function unquote(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if (first === last && (first === '"' || first === "'")) {
      const inner = value.slice(1, -1);
      return first === '"' ? inner.replace(/\\(["\\])/g, '$1') : inner;
    }
  }
  return value;
}

function parseInlineList(value) {
  const inner = value.slice(1, -1).trim();
  if (inner === '') return [];
  const items = [];
  let current = '';
  let quote = null;
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (quote) {
      current += ch;
      if (ch === quote && inner[i - 1] !== '\\') quote = null;
    } else if (ch === '"' || ch === "'") {
      current += ch;
      quote = ch;
    } else if (ch === ',') {
      items.push(unquote(current.trim()));
      current = '';
    } else {
      current += ch;
    }
  }
  if (quote) return null; // unterminated quote — outside the subset
  items.push(unquote(current.trim()));
  return items;
}

/**
 * Parse frontmatter. Returns { data, body, raw }:
 *   data — object (string | string[] values), or null when there is no
 *          fence or the block falls outside the supported subset;
 *   body — content after the closing fence (original content when no
 *          fence / unparseable block);
 *   raw  — the exact frontmatter text between the fences (null when no
 *          fence), preserved so callers can do textual edits instead of
 *          reserializing.
 */
function parse(content) {
  if (!hasBlock(content)) return { data: null, body: content, raw: null };

  const fenceEnd = content.match(/\r?\n---[ \t]*(\r?\n|$)/);
  if (!fenceEnd) return { data: null, body: content, raw: null };

  const open = content.match(OPEN)[0].length;
  const rawBlock = content.slice(open, fenceEnd.index);
  const body = content.slice(fenceEnd.index + fenceEnd[0].length);

  const data = {};
  const lines = rawBlock.split(/\r?\n/);
  let pendingKey = null;
  const emptyKeys = new Set();

  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const listItem = line.match(/^\s+-\s?(.*)$/);
    if (listItem) {
      if (pendingKey === null) return { data: null, body: content, raw: rawBlock };
      data[pendingKey].push(unquote(listItem[1].trim()));
      emptyKeys.delete(pendingKey);
      continue;
    }
    if (/^\s/.test(line)) return { data: null, body: content, raw: rawBlock }; // nested structure
    const kv = line.match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (!kv) return { data: null, body: content, raw: rawBlock };
    const key = kv[1];
    const value = kv[2].trim();
    if (value === '') {
      data[key] = [];
      pendingKey = key; // block list opener — or an empty scalar (normalized below)
      emptyKeys.add(key);
      continue;
    }
    pendingKey = null;
    if (value.startsWith('[') && value.endsWith(']')) {
      const list = parseInlineList(value);
      if (list === null) return { data: null, body: content, raw: rawBlock };
      data[key] = list;
    } else {
      data[key] = unquote(value);
    }
  }

  // `key:` that never received list items is an empty string scalar.
  for (const key of emptyKeys) data[key] = '';

  return { data, body, raw: rawBlock };
}

const NEEDS_QUOTES = /[:#\[\]{}&*!|>'"%@`,]|^[\s-]|\s$|^$|^(true|false|null|~|yes|no|on|off)$|^[\d.+-]/i;

function quoteScalar(value) {
  const str = String(value);
  if (!NEEDS_QUOTES.test(str)) return str;
  return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Serialize a data object to frontmatter YAML lines (no fences). */
function stringifyData(data) {
  const lines = [];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map(quoteScalar).join(', ')}]`);
    } else {
      lines.push(`${key}: ${quoteScalar(value)}`);
    }
  }
  return lines.join('\n');
}

/** Compose a full document: fenced frontmatter + body. */
function compose(data, body) {
  const yaml = stringifyData(data);
  const sep = body && !body.startsWith('\n') ? '\n' : '';
  return `---\n${yaml}\n---\n${sep}${body || ''}`;
}

/**
 * Insert `type: <value>` as the first line of an EXISTING frontmatter
 * block, textually — everything else in the file is preserved
 * byte-for-byte. Returns null when the file has no block.
 */
function insertTypeLine(content, type) {
  if (!hasBlock(content)) return null;
  const open = content.match(OPEN)[0];
  return `${open}type: ${quoteScalar(type)}\n${content.slice(open.length)}`;
}

module.exports = { hasBlock, parse, stringifyData, compose, insertTypeLine, quoteScalar };
