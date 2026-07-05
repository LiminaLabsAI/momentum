// Docs navigation model — the single source of truth for the sidebar order,
// group labels, prev/next sequencing, and the command-palette page list.
// Slugs match content-collection entry ids (and therefore `/{slug}/` URLs).

export interface NavItem {
	slug: string;
	label: string;
}
export interface NavGroup {
	label: string;
	items: NavItem[];
}

export const docsNav: NavGroup[] = [
	{
		label: 'Start here',
		items: [
			{ slug: 'getting-started', label: 'Getting started' },
			{ slug: 'concepts', label: 'Concepts' },
			{ slug: 'parallel-work', label: 'Parallel work' },
		],
	},
	{
		label: 'Reference',
		items: [
			{ slug: 'skills', label: 'Skills' },
			{ slug: 'rules', label: 'Rules' },
			{ slug: 'ide-support', label: 'IDE support' },
		],
	},
	{
		label: 'Orchestration',
		items: [
			{ slug: 'ecosystem', label: 'Ecosystem' },
			{ slug: 'orchestration', label: 'Cross-project actions' },
			{ slug: 'swarm', label: 'Swarm' },
		],
	},
	{
		label: 'More',
		items: [
			{ slug: 'faq', label: 'FAQ' },
			{ slug: 'about', label: 'About' },
		],
	},
];

/** Flattened reading order across all groups. */
export const docsOrder: NavItem[] = docsNav.flatMap((g) => g.items);

/** The default landing doc (nav's first entry). */
export const docsHome = docsOrder[0]?.slug ?? 'getting-started';

/** Group label + prev/next neighbours for a given slug. */
export function navContext(slug: string): {
	group: string;
	prev: NavItem | null;
	next: NavItem | null;
} {
	const group =
		docsNav.find((g) => g.items.some((i) => i.slug === slug))?.label ?? '';
	const idx = docsOrder.findIndex((i) => i.slug === slug);
	const prev = idx > 0 ? docsOrder[idx - 1] : null;
	const next =
		idx >= 0 && idx < docsOrder.length - 1 ? docsOrder[idx + 1] : null;
	return { group, prev, next };
}
