'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, write, read } = require('./_helpers');
const init = require('../core/ecosystem/lib/initiative');

// ─────────────────────────────────────────────────────────────────────────────
// Frontmatter parse / serialize round-trip
// ─────────────────────────────────────────────────────────────────────────────

test('parseFrontmatter handles scalars + inline arrays', () => {
  const body =
    '---\n' +
    'id: 42\n' +
    'slug: memory-module\n' +
    'status: in-progress\n' +
    'started: 2026-06-07\n' +
    'owner: avinash\n' +
    'repos: [sapience, frontend, infra]\n' +
    'title: "Memory module v1"\n' +
    '---\n' +
    '\n' +
    '# Body\n';
  const { frontmatter, content } = init.parseFrontmatter(body);
  assert.equal(frontmatter.id, 42);
  assert.equal(frontmatter.slug, 'memory-module');
  assert.deepEqual(frontmatter.repos, ['sapience', 'frontend', 'infra']);
  assert.equal(frontmatter.title, 'Memory module v1');
  assert.match(content, /# Body/);
});

test('parseFrontmatter returns null when no frontmatter present', () => {
  const r = init.parseFrontmatter('# Just a heading\n');
  assert.equal(r.frontmatter, null);
});

test('serializeFrontmatter quotes scalars containing ambiguous chars', () => {
  const s = init.serializeFrontmatter({
    id: 1,
    slug: 'x',
    title: 'Has, commas',
    repos: ['a', 'b'],
  });
  assert.match(s, /^---\n/);
  assert.match(s, /\ntitle: "Has, commas"\n/);
  assert.match(s, /\nrepos: \[a, b\]\n/);
  assert.match(s, /\n---\n$/);
});

test('frontmatter round-trips through write+parse', () => {
  const tmp = mktmp();
  try {
    const fp = path.join(tmp, 'demo.md');
    const fm = {
      id: 1,
      slug: 'demo',
      status: 'in-progress',
      started: '2026-06-07',
      owner: 'tester',
      repos: ['a', 'b'],
    };
    init.writeInitiative(fp, fm, '# Body\nstuff\n');
    const back = init.parseFrontmatter(read(fp));
    assert.deepEqual(back.frontmatter, fm);
    assert.match(back.content, /# Body/);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

test('validateFrontmatter accepts a fully-populated valid record', () => {
  const fm = {
    id: 1,
    slug: 'memory-module',
    status: 'in-progress',
    started: '2026-06-07',
    owner: 'avinash',
    repos: ['sapience'],
  };
  assert.deepEqual(init.validateFrontmatter(fm), { ok: true });
});

test('validateFrontmatter requires closed date when status=closed', () => {
  const fm = {
    id: 1, slug: 's', status: 'closed', started: '2026-06-07',
    owner: 'x', repos: ['a'],
    // no `closed`
  };
  const r = init.validateFrontmatter(fm);
  assert.equal(r.ok, false);
  assert.ok(r.errors.find((e) => e.path === '$.closed'));
});

test('validateFrontmatter rejects bad slug + bad status + empty repos', () => {
  const fm = {
    id: 0, // < 1
    slug: 'Bad Slug',
    status: 'WAT',
    started: 'not-a-date',
    owner: '',
    repos: [],
  };
  const r = init.validateFrontmatter(fm);
  assert.equal(r.ok, false);
  assert.ok(r.errors.length >= 5);
});

// ─────────────────────────────────────────────────────────────────────────────
// Numbering + active state
// ─────────────────────────────────────────────────────────────────────────────

test('nextInitiativeId returns 1 on empty dir', () => {
  const tmp = mktmp();
  try {
    assert.equal(init.nextInitiativeId(tmp), 1);
  } finally {
    rmrf(tmp);
  }
});

test('nextInitiativeId picks max+1 across existing files', () => {
  const tmp = mktmp();
  try {
    fs.mkdirSync(path.join(tmp, init.INITIATIVES_DIR), { recursive: true });
    fs.writeFileSync(path.join(tmp, init.INITIATIVES_DIR, '0001-a.md'), '');
    fs.writeFileSync(path.join(tmp, init.INITIATIVES_DIR, '0007-b.md'), '');
    fs.writeFileSync(path.join(tmp, init.INITIATIVES_DIR, 'README.md'), ''); // ignored
    assert.equal(init.nextInitiativeId(tmp), 8);
  } finally {
    rmrf(tmp);
  }
});

test('setActive/getActive/clearActive round-trip', () => {
  const tmp = mktmp();
  try {
    assert.equal(init.getActive(tmp), null);
    init.setActive(tmp, 'foo');
    assert.equal(init.getActive(tmp), 'foo');
    init.clearActive(tmp);
    assert.equal(init.getActive(tmp), null);
  } finally {
    rmrf(tmp);
  }
});

test('loadInitiative finds by slug and parses', () => {
  const tmp = mktmp();
  try {
    fs.mkdirSync(path.join(tmp, init.INITIATIVES_DIR), { recursive: true });
    init.writeInitiative(
      init.initiativePath(tmp, 3, 'thing'),
      {
        id: 3, slug: 'thing', status: 'in-progress',
        started: '2026-06-07', owner: 'me', repos: ['x'],
      },
      '# Thing\n',
    );
    const r = init.loadInitiative(tmp, 'thing');
    assert.ok(r);
    assert.equal(r.frontmatter.id, 3);
    assert.match(r.content, /# Thing/);
  } finally {
    rmrf(tmp);
  }
});

test('writeInitiative refuses to write invalid frontmatter', () => {
  const tmp = mktmp();
  try {
    const fp = path.join(tmp, 'bad.md');
    assert.throws(() => {
      init.writeInitiative(fp, { id: 0, slug: 'x' }, '');
    }, /validation failed/);
  } finally {
    rmrf(tmp);
  }
});
