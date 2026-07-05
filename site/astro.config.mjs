// @ts-check
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import mdx from '@astrojs/mdx';
import rehypeMermaid from 'rehype-mermaid';
import remarkDirective from 'remark-directive';
import remarkCustomHeadingId from 'remark-custom-heading-id';
import { remarkAsides } from './src/plugins/remark-asides.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://trymomentum.github.io',
	base: '/',
	trailingSlash: 'always',
	markdown: {
		// Exclude `mermaid` from Shiki so the raw <code class="language-mermaid">
		// survives for rehype-mermaid to convert to inline SVG (otherwise Shiki
		// highlights it as a plain code block and the diagram never renders).
		syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
		// Dark code blocks (#0d1117) matching the design's terminal surfaces.
		shikiConfig: { theme: 'github-dark-default', wrap: false },
		// remarkDirective parses `:::note[...]` containers; remarkAsides turns
		// them into styled <aside>. remarkCustomHeadingId parses kramdown-style
		// {#custom-id} anchors so headings keep stable short cross-page slugs
		// (e.g. /orchestration/#scout).
		remarkPlugins: [remarkDirective, remarkAsides, remarkCustomHeadingId],
		// Server-side render Mermaid blocks to inline SVG via Playwright.
		// Zero client-side JS for diagrams; keeps Lighthouse green.
		rehypePlugins: [
			[
				rehypeMermaid,
				{
					strategy: 'inline-svg',
					mermaidConfig: {
						// Brand-tinted neutral palette baked into the SVG. The SVG
						// renders IDENTICALLY in light + dark modes; what changes is
						// only the Mermaid container surface (see mermaid.css).
						theme: 'base',
						themeVariables: {
							primaryColor: '#e6ecff', // cobalt-50 — node fill
							primaryBorderColor: '#0023ae', // cobalt ink — node border
							primaryTextColor: '#15161c', // fg-0 light — node text
							secondaryColor: '#f1f2f7',
							secondaryBorderColor: '#94a3b8',
							secondaryTextColor: '#15161c',
							tertiaryColor: '#f8fafc',
							tertiaryBorderColor: '#cbd5e1',
							lineColor: '#5b5f6b', // fg-2 — arrow lines
							textColor: '#15161c',
							actorBkg: '#e6ecff',
							actorBorder: '#0023ae',
							actorTextColor: '#15161c',
							actorLineColor: '#5b5f6b',
							signalColor: '#5b5f6b',
							signalTextColor: '#15161c',
							labelBoxBkgColor: '#f1f2f7',
							labelBoxBorderColor: '#cbd5e1',
							labelTextColor: '#15161c',
							loopTextColor: '#15161c',
							noteBkgColor: '#fef3c7',
							noteTextColor: '#15161c',
							noteBorderColor: '#fcd34d',
							activationBkgColor: '#dbe3ff',
							activationBorderColor: '#5f7dff',
							stateLabelColor: '#15161c',
							transitionColor: '#5b5f6b',
							transitionLabelColor: '#15161c',
							fontSize: '14px',
							fontFamily:
								"'Geist Variable', Geist, system-ui, sans-serif",
						},
					},
				},
			],
		],
	},
	integrations: [
		// Build-time inlined SVG icons from @iconify-json/lucide. Zero client
		// JS; keeps Lighthouse green and satisfies the no-external-CDN posture.
		icon(),
		// MDX support for docs that embed Astro components (e.g. ecosystem.mdx).
		mdx(),
	],
});
