// site/scripts/generate-og-cards.mjs
//
// Convert the OG card SVG into PNG(s) under site/public/og/. Wired as a
// `prebuild` step in package.json so every `astro build` runs it.
//
// v1 ships a single default card used across every page. Per-page custom
// cards (title overlay) are a Group 5 follow-up.

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SOURCES = [
	{
		input: resolve(ROOT, 'src/assets/og/og-template.svg'),
		output: resolve(ROOT, 'public/og/default.png'),
		label: 'default',
	},
];

await mkdir(resolve(ROOT, 'public/og'), { recursive: true });

for (const { input, output, label } of SOURCES) {
	const svg = await readFile(input);
	const png = await sharp(svg, { density: 144 })
		.resize(1200, 630, { fit: 'cover' })
		.png({ compressionLevel: 9, quality: 90 })
		.toBuffer();
	await writeFile(output, png);
	console.log(`✓ generated og/${label}.png`);
}
