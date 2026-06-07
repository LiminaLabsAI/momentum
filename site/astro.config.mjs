// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import rehypeMermaid from 'rehype-mermaid';

// https://astro.build/config
export default defineConfig({
	site: 'https://trymomentum.github.io',
	base: '/',
	trailingSlash: 'always',
	// Server-side render Mermaid blocks to inline SVG via Playwright.
	// Zero client-side JS for diagrams; keeps Lighthouse green.
	markdown: {
		syntaxHighlight: 'shiki',
		rehypePlugins: [
			[
				rehypeMermaid,
				{
					strategy: 'inline-svg',
					mermaidConfig: {
						theme: 'base',
						themeVariables: {
							// Brand-tinted neutral palette that works in both
							// light and dark mode without per-theme rebuilds.
							primaryColor: '#EEF2FF',
							primaryBorderColor: '#4F46E5',
							primaryTextColor: '#0F172A',
							secondaryColor: '#F1F5F9',
							secondaryBorderColor: '#94A3B8',
							secondaryTextColor: '#0F172A',
							tertiaryColor: '#F8FAFC',
							tertiaryBorderColor: '#CBD5E1',
							lineColor: '#475569',
							textColor: '#0F172A',
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
				'Spec-driven discipline for AI-assisted coding. Works with Claude Code, Codex, Antigravity, and more.',
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
						{ label: 'Ecosystem mode', slug: 'ecosystem' },
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
