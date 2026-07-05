// site/scripts/check-dist-content.mjs
//
// Postbuild content gate (BUG-013). Wired as a `postbuild` step in
// package.json so every `npm run build` runs it.
//
// When Playwright's chromium-headless-shell is missing, rehype-mermaid's
// browserType.launch error is log-only: `astro build` still exits 0 while
// every mermaid page ships an EMPTY `sl-markdown-content` body — and the
// empty renders get cached in `.astro`/`node_modules/.astro`, so a fresh
// CI/deploy environment can silently publish a gutted site. This script
// scans every dist/**/index.html and fails the build (exit 1) if any page
// body is empty or whitespace-only. Zero dependencies.

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');

// The landing page is a custom splash without a `.doc` article — for it we
// just require a non-trivial <body>.
const SPLASH_MIN_BODY_CHARS = 1000;

/** Recursively collect every index.html under dir. */
async function findPages(dir) {
	const pages = [];
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) pages.push(...(await findPages(path)));
		else if (entry.name === 'index.html') pages.push(path);
	}
	return pages.sort();
}

/** Inner HTML of the rendered `<article class="doc">`; null if absent. */
function extractMarkdownContent(html) {
	const m = /<article[^>]*\bclass="[^"]*\bdoc\b[^"]*"[^>]*>([\s\S]*?)<\/article>/.exec(
		html,
	);
	return m ? m[1] : null;
}

/** Visible text length: strip tags, collapse whitespace. */
function textLength(html) {
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim().length;
}

let pages;
try {
	pages = await findPages(DIST);
} catch {
	console.error(`✗ dist content gate: no dist/ directory at ${DIST} — run \`npm run build\` first.`);
	process.exit(1);
}
if (pages.length === 0) {
	console.error('✗ dist content gate: dist/ contains no index.html pages.');
	process.exit(1);
}

const failures = [];
let minBody = Infinity;

for (const page of pages) {
	const rel = relative(DIST, page) || 'index.html';
	const html = await readFile(page, 'utf8');

	if (page === join(DIST, 'index.html')) {
		// Landing splash: no content div — require a non-trivial <body>.
		const body = /<body[^>]*>([\s\S]*?)<\/body>/.exec(html)?.[1] ?? '';
		const size = textLength(body);
		if (size < SPLASH_MIN_BODY_CHARS) {
			failures.push({ rel, reason: `splash <body> too small (${size} chars of text, need ≥ ${SPLASH_MIN_BODY_CHARS})` });
		} else {
			minBody = Math.min(minBody, size);
		}
		continue;
	}

	const content = extractMarkdownContent(html);
	if (content === null) {
		failures.push({ rel, reason: 'no <article class="doc"> found' });
		continue;
	}
	const size = textLength(content);
	if (size === 0) {
		failures.push({ rel, reason: 'doc article body is empty/whitespace' });
	} else {
		minBody = Math.min(minBody, size);
	}
}

if (failures.length > 0) {
	console.error(`✗ dist content gate: ${failures.length} of ${pages.length} page(s) shipped an empty body (BUG-013):`);
	for (const { rel, reason } of failures) console.error(`    - ${rel}: ${reason}`);
	console.error(
		'\n  Likely cause: Playwright chromium-headless-shell is missing, so rehype-mermaid',
		'\n  pages render empty while the build exits 0. Fix:',
		'\n      npx playwright install chromium-headless-shell',
		'\n  then clear the cached empty renders (.astro/ and node_modules/.astro/) and rebuild.',
	);
	process.exit(1);
}

console.log(`✓ dist content gate: ${pages.length} page(s) checked, all bodies non-empty (min ${minBody} chars)`);
