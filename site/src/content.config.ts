import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Plain Astro content collection for the docs (post-Starlight). Each entry's
// id is its path under src/content/docs without the extension, e.g.
// `getting-started`, and is served at `/{id}/` by src/pages/[...slug].astro.
//
// The `!**/._*` glob excludes macOS AppleDouble sidecar files (`._foo.md`)
// that some external drives generate next to every real file.
const docs = defineCollection({
	loader: glob({
		pattern: ['**/[^_]*.{md,mdx}', '!**/._*'],
		base: './src/content/docs',
	}),
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
	}),
});

export const collections = { docs };
