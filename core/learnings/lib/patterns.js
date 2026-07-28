'use strict';

/**
 * Phase 34 G1 — the detector, scored against `recurring-patterns-v1`.
 *
 * PURE. `(corpus) → {classes}`. No filesystem access; `corpus.js` owns that.
 *
 * ## Two questions, two methods
 *
 * They are not variations of one fuzzy text pass, and pretending otherwise
 * would overstate what this can do:
 *
 * 1. **Recurrence** — is a defect class repeating? This *is* a text question,
 *    and momentum's own corpus answers it directly: entries say "Fourth
 *    instance of this class in one arc (BUG-002 …, BUG-030 …, BUG-031 …)". The
 *    detector reads those declarations and harvests the ids cited alongside
 *    them. It is not inferring a latent pattern from vocabulary; it is counting
 *    something authors already wrote down and nobody ever tallied.
 *
 * 2. **Stale closure** — does a row claim to be open while the code says it
 *    landed? Not a text question at all. It is a contradiction between a row's
 *    `status` cell and the presence of closing markers in shipped source.
 *
 * ## Why this is not a lookup wearing a costume
 *
 * The honest risk, written into the phase plan before any code: a detector
 * that only finds what its author already knew. Two things keep it honest —
 * no member id is hardcoded anywhere in this file, and the classes come from
 * the corpus text, so stripping the declarations collapses the class. The
 * strip test in `tests/learnings-detection.test.js` is what proves it.
 */

const ORDINAL = '(?:second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\\d+(?:st|nd|rd|th))';

/** "Fourth instance of this class", "Sixth variant of …" — a declared recurrence. */
const DECLARATION = new RegExp(
  `${ORDINAL}\\s+(?:instance|variant|occurrence|time)\\b`,
  'gi',
);

const ID = /\b(?:BUG|FEAT|TD|ENH|VAL)-\d+\b/g;
/** "Phase 33", "phase-33" — phases are class members too, and are cited differently. */
const PHASE_REF = /\bphase[\s-](\d+[a-e]?)\b/gi;

/**
 * Markers whose wording says the work is still OUTSTANDING, not landed.
 *
 * `TD-012 tracks consolidating this shipped-runtime story` is a pointer to
 * future work, not evidence of closure. Counting it would report an open item
 * as stale for the crime of being mentioned.
 */
const STILL_OPEN = /\b(tracks?|pending|planned|future|should|would|todo|will)\b/i;

/** Source trees whose mention of an id is evidence the work actually landed. */
const SOURCE_DIRS = /^(core|bin|scripts)\//;

/**
 * The evidence block a declaration governs — bounded by the document's own
 * structure, not by a byte count.
 *
 * A fixed window is the wrong tool and fails in both directions: too small and
 * it truncates the table a declaration introduces (the phase-33 retrospective
 * cites its sixth member 414 characters after the phrase, so a 400-byte window
 * silently loses it); too large and a declaration inside a backlog file
 * harvests every id in the file.
 *
 * Two shapes, two bounds:
 *
 *   - **Inside a table row** (`| … |`) — the row IS the unit. A backlog entry
 *     citing its siblings does so inline, and neighbouring rows are separate
 *     records that happen to be adjacent.
 *   - **In prose** — the declaration governs the rest of its section, which is
 *     where the table it introduces lives. Bounded by the next heading.
 */
function evidenceBlock(text, index) {
  const lineStart = text.lastIndexOf('\n', index) + 1;
  let lineEnd = text.indexOf('\n', index);
  if (lineEnd === -1) lineEnd = text.length;
  const line = text.slice(lineStart, lineEnd);

  if (line.trimStart().startsWith('|')) return line;

  const nextHeading = text.indexOf('\n#', index);
  const end = nextHeading === -1 ? text.length : nextHeading;
  return text.slice(lineStart, end);
}

/**
 * Find declared recurrences and the members cited with them.
 *
 * One class per distinct declaration site, merged by overlapping membership —
 * the same class is usually declared more than once as it grows (BUG-034 says
 * "fourth", the phase-33 retrospective says "sixth"), and reporting those as
 * two classes would double-count the very thing being counted.
 */
function findRecurrence(prose) {
  const found = [];

  for (const text of prose || []) {
    DECLARATION.lastIndex = 0;
    let m;
    while ((m = DECLARATION.exec(text)) !== null) {
      const near = evidenceBlock(text, m.index);
      const members = new Set();
      for (const id of near.match(ID) || []) members.add(id);
      for (const p of near.match(PHASE_REF) || []) {
        members.add(`phase-${p.replace(/phase[\s-]/i, '')}`);
      }
      if (members.size < 2) continue;      // a declaration citing nothing is prose
      found.push({ declaration: m[0], members });
    }
  }

  // Merge declarations that describe the same class.
  const classes = [];
  for (const f of found) {
    const hit = classes.find((c) => [...f.members].some((id) => c.members.has(id)));
    if (hit) {
      for (const id of f.members) hit.members.add(id);
      hit.declarations.push(f.declaration);
    } else {
      classes.push({ members: new Set(f.members), declarations: [f.declaration] });
    }
  }

  return classes
    .filter((c) => c.members.size >= 3)   // two co-cited ids is a reference, not a class
    .map((c) => ({
      name: 'recurrence',
      members: [...c.members].sort(),
      evidence: c.declarations,
    }));
}

/**
 * Rows that say `open` while shipped source carries a closing marker.
 *
 * The status gate is doing real work here, and it is why the parser matters:
 * BUG-007, BUG-027 and BUG-028 are `resolved` and carry plenty of markers. A
 * reader that mangles their status cell — which is exactly what splitting on
 * every `|` does to a row containing `apply_patch\|shell` — promotes all three
 * into false positives.
 */
function findStaleClosure(rows, markers, isOpen) {
  const out = [];
  for (const row of rows || []) {
    if (!isOpen(row)) continue;
    const hits = (markers || {})[row.id] || [];
    const landed = hits.filter(
      (h) => SOURCE_DIRS.test(h.file) && !STILL_OPEN.test(h.text),
    );
    if (!landed.length) continue;
    out.push({
      id: row.id,
      status: row.status,
      evidence: landed.map((h) => `${h.file}:${h.line}`),
    });
  }
  return out;
}

/**
 * @param {{rows: object[], markers: object, prose: string[]}} corpus
 * @param {{isOpen: function}} [deps] — injected so the status predicate has one
 *   implementation, in `corpus.js`, rather than a second copy here.
 */
function detect(corpus, deps = {}) {
  const c = corpus || {};
  const isOpen = deps.isOpen || require('./corpus').isOpen;

  const recurrence = findRecurrence(c.prose);
  const stale = findStaleClosure(c.rows, c.markers, isOpen);

  const classes = [...recurrence];
  if (stale.length) {
    classes.push({
      name: 'stale-closure',
      members: stale.map((s) => s.id).sort(),
      evidence: stale.map((s) => `${s.id}: ${s.evidence.join(', ')}`),
    });
  }
  return { classes };
}

module.exports = { detect, findRecurrence, findStaleClosure };
