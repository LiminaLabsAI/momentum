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
							primaryColor: '#dde5ff', // cobalt-50 — node fill
							primaryBorderColor: '#2f5be0', // cobalt — node border (visible)
							primaryTextColor: '#0d1330', // near-ink — node text (high contrast)
							nodeTextColor: '#0d1330',
							secondaryColor: '#eceef6',
							secondaryBorderColor: '#8b93b8',
							secondaryTextColor: '#0d1330',
							tertiaryColor: '#f3f5fb',
							tertiaryBorderColor: '#c3cbe0',
							lineColor: '#4a4f5e', // arrow lines (darker for contrast)
							textColor: '#0d1330',
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
							stateLabelColor: '#0d1330',
							transitionColor: '#4a4f5e',
							transitionLabelColor: '#0d1330',
							fontSize: '15px',
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
