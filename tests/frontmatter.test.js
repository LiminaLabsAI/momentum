'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const fm = require('../core/lib/frontmatter');

test('parse: no fence → data null, body untouched', () => {
  const content = '# Just markdown\n\nbody\n';
  const res = fm.parse(content);
  assert.equal(res.data, null);
  assert.equal(res.body, content);
  assert.equal(res.raw, null);
});

test('parse: simple scalars, quotes stripped', () => {
  const res = fm.parse('---\ntype: Phase\ntitle: "Phase 24 — OKF"\nnote: \'x\'\n---\n\nbody\n');
  assert.deepEqual(res.data, { type: 'Phase', title: 'Phase 24 — OKF', note: 'x' });
  assert.equal(res.body, '\nbody\n');
});

test('parse: inline list with quoted items', () => {
  const res = fm.parse('---\ntags: [okf, "BigQuery Table", waves]\n---\nb');
  assert.deepEqual(res.data.tags, ['okf', 'BigQuery Table', 'waves']);
});

test('parse: block list', () => {
  const res = fm.parse('---\ndeps:\n  - G0\n  - G1\n---\nb');
  assert.deepEqual(res.data.deps, ['G0', 'G1']);
});

test('parse: empty inline list and empty scalar', () => {
  const res = fm.parse('---\ndeps: []\nresource:\n---\nb');
  assert.deepEqual(res.data.deps, []);
  assert.equal(res.data.resource, '');
});

test('parse: comments and blank lines skipped', () => {
  const res = fm.parse('---\n# comment\ntype: Note\n\n---\nb');
  assert.deepEqual(res.data, { type: 'Note' });
});

test('parse: nested map → tolerant null, body = whole content', () => {
  const content = '---\nmeta:\n  nested: true\n---\nb';
  const res = fm.parse(content);
  assert.equal(res.data, null);
  assert.equal(res.body, content);
});

test('parse: unterminated fence → tolerant null', () => {
  const res = fm.parse('---\ntype: Note\nno closing fence\n');
  assert.equal(res.data, null);
});

test('parse: never throws on junk', () => {
  for (const junk of [null, undefined, 42, '', '---', '---\n', '---\n---\n']) {
    assert.doesNotThrow(() => fm.parse(junk));
  }
  assert.deepEqual(fm.parse('---\n---\n').data, {});
});

test('parse: CRLF line endings', () => {
  const res = fm.parse('---\r\ntype: Phase\r\nstatus: complete\r\n---\r\nbody');
  assert.deepEqual(res.data, { type: 'Phase', status: 'complete' });
});

test('roundtrip: compose(parse(x)) preserves unknown keys and order', () => {
  const original = fm.compose(
    { type: 'Phase', custom_key: 'kept', tags: ['a', 'b'], status: 'complete' },
    '\n# Body\n',
  );
  const parsed = fm.parse(original);
  assert.deepEqual(Object.keys(parsed.data), ['type', 'custom_key', 'tags', 'status']);
  const recomposed = fm.compose(parsed.data, parsed.body);
  assert.equal(recomposed, original);
});

test('stringify: quoting for special values', () => {
  const yaml = fm.stringifyData({
    plain: 'hello-world',
    colon: 'a: b',
    hash: 'a #b',
    numeric: '0.1',
    bool: 'true',
    empty: '',
  });
  assert.equal(
    yaml,
    ['plain: hello-world', 'colon: "a: b"', 'hash: "a #b"', 'numeric: "0.1"', 'bool: "true"', 'empty: ""'].join('\n'),
  );
  // Quoted values must parse back to the originals.
  const back = fm.parse(`---\n${yaml}\n---\n`);
  assert.equal(back.data.colon, 'a: b');
  assert.equal(back.data.numeric, '0.1');
  assert.equal(back.data.empty, '');
});

test('insertTypeLine: textual insertion preserves everything else', () => {
  const content = '---\nweird: |unparseable-but-untouched\n---\nbody stays\n';
  const out = fm.insertTypeLine(content, 'Note');
  assert.equal(out, '---\ntype: Note\nweird: |unparseable-but-untouched\n---\nbody stays\n');
  assert.equal(fm.insertTypeLine('no fence', 'Note'), null);
});

test('hasBlock', () => {
  assert.equal(fm.hasBlock('---\nx: y\n---\n'), true);
  assert.equal(fm.hasBlock('--- not a fence'), false);
  assert.equal(fm.hasBlock('x\n---\n'), false);
});
