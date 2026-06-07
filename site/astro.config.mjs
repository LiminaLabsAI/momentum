// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://avinash-singh-io.github.io',
	base: '/momentum',
	trailingSlash: 'always',
	integrations: [
		starlight({
			title: 'momentum',
			description:
				'Spec-driven discipline for AI-assisted coding. Works with Claude Code, Codex, Antigravity, and more.',
			customCss: ['./src/styles/custom.css'],
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
