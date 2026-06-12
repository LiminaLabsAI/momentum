// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import rehypeMermaid from 'rehype-mermaid';
import remarkCustomHeadingId from 'remark-custom-heading-id';

// https://astro.build/config
export default defineConfig({
	site: 'https://trymomentum.github.io',
	base: '/',
	trailingSlash: 'always',
	// Server-side render Mermaid blocks to inline SVG via Playwright.
	// Zero client-side JS for diagrams; keeps Lighthouse green.
	markdown: {
		syntaxHighlight: 'shiki',
		// Parse kramdown-style {#custom-id} anchors so headings can keep
		// stable short slugs for cross-page links (e.g. /orchestration/#scout)
		// even when the full heading text would auto-slug to something long.
		remarkPlugins: [remarkCustomHeadingId],
		rehypePlugins: [
			[
				rehypeMermaid,
				{
					strategy: 'inline-svg',
					mermaidConfig: {
						// Brand-tinted neutral palette baked into the SVG. The
						// SVG renders IDENTICALLY in light + dark modes; what
						// changes is only the Mermaid container surface (see
						// mermaid.css). Lines + arrows + text use mid-tone
						// slate that's readable on both light page backgrounds
						// (default) and the slightly-lighter container we use
						// even in dark mode.
						theme: 'base',
						themeVariables: {
							primaryColor: '#EEF2FF',          // indigo-50 — node fill
							primaryBorderColor: '#4F46E5',    // indigo-600 — node border
							primaryTextColor: '#0F172A',      // slate-900 — node text
							secondaryColor: '#F1F5F9',        // slate-100
							secondaryBorderColor: '#94A3B8',  // slate-400
							secondaryTextColor: '#0F172A',
							tertiaryColor: '#F8FAFC',         // slate-50
							tertiaryBorderColor: '#CBD5E1',   // slate-300
							lineColor: '#475569',             // slate-600 — arrow lines
							textColor: '#0F172A',
							// Sequence-diagram specific (these were missing
							// before; that's why arrows + messages disappeared
							// in dark mode after the invert filter).
							actorBkg: '#EEF2FF',
							actorBorder: '#4F46E5',
							actorTextColor: '#0F172A',
							actorLineColor: '#475569',
							signalColor: '#475569',
							signalTextColor: '#0F172A',
							labelBoxBkgColor: '#F1F5F9',
							labelBoxBorderColor: '#CBD5E1',
							labelTextColor: '#0F172A',
							loopTextColor: '#0F172A',
							noteBkgColor: '#FEF3C7',
							noteTextColor: '#0F172A',
							noteBorderColor: '#FCD34D',
							activationBkgColor: '#E0E7FF',
							activationBorderColor: '#818CF8',
							// State-diagram specific (used on /concepts/)
							stateLabelColor: '#0F172A',
							transitionColor: '#475569',
							transitionLabelColor: '#0F172A',
							fontSize: '14px',
							fontFamily:
								"'Inter Variable', Inter, system-ui, sans-serif",
						},
					},
				},
			],
		],
	},
	integrations: [
		starlight({
			title: 'momentum',
			description:
				'Spec-driven development for agentic AI. Phases, decisions, history, backlog — first-class state across any AI IDE.',
			logo: {
				src: './src/assets/logo/wordmark.svg',
				replacesTitle: true,
			},
			customCss: [
				'@fontsource-variable/inter',
				'./src/styles/custom.css',
				'./src/styles/mermaid.css',
			],
			head: [
				{
					tag: 'meta',
					attrs: {
						property: 'og:image',
						content: 'https://trymomentum.github.io/og/default.png',
					},
				},
				{
					tag: 'meta',
					attrs: {
						name: 'twitter:card',
						content: 'summary_large_image',
					},
				},
				{
					tag: 'meta',
					attrs: {
						name: 'twitter:image',
						content: 'https://trymomentum.github.io/og/default.png',
					},
				},
			],
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/avinash-singh-io/momentum',
				},
			],
			sidebar: [
				{
					label: 'Start here',
					items: [
						{ label: 'Getting started', slug: 'getting-started' },
						{ label: 'Concepts', slug: 'concepts' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Skills', slug: 'skills' },
						{ label: 'Rules', slug: 'rules' },
						{ label: 'IDE support', slug: 'ide-support' },
					],
				},
				{
					label: 'Multi-project work',
					items: [
						{ label: 'Ecosystem (foundation)', slug: 'ecosystem' },
						{ label: 'Quick verbs (Tier 1)', slug: 'orchestration' },
						{ label: 'Swarm (Tier 2)', slug: 'swarm' },
					],
				},
				{
					label: 'More',
					items: [
						{ label: 'FAQ', slug: 'faq' },
						{ label: 'About', slug: 'about' },
					],
				},
			],
		}),
	],
});
