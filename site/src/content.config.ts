import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		// Exclude macOS AppleDouble sidecar files (`._foo.md`) that the
		// T7 Shield external drive generates next to every real file.
		// Without this, Starlight tries to read them as content entries
		// and fails because they don't have valid frontmatter.
		loader: docsLoader({ pattern: ['**/[^_]*.{md,mdx}', '**/*.{md,mdx}', '!**/._*'] }),
		schema: docsSchema(),
	}),
};
