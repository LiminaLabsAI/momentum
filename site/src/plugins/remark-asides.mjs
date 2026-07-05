/**
 * remark-asides — render Starlight-style container directives
 *
 *     :::note[Optional title]
 *     body markdown
 *     :::
 *
 * into `<aside class="doc-aside doc-aside--note">` with a title row. Requires
 * `remark-directive` earlier in the pipeline (it produces the
 * `containerDirective` nodes this transform rewrites). Kept dependency-free —
 * a small manual tree walk instead of unist-util-visit.
 */

const KINDS = {
	note: 'Note',
	tip: 'Tip',
	important: 'Important',
	caution: 'Caution',
	warning: 'Caution',
	danger: 'Danger',
};

export function remarkAsides() {
	return (tree) => {
		walk(tree);
	};
}

function walk(node) {
	if (!node || !Array.isArray(node.children)) return;
	for (const child of node.children) {
		if (child.type === 'containerDirective' && KINDS[child.name]) {
			transform(child);
		}
		walk(child);
	}
}

function transform(node) {
	const kind = node.name;
	// A `[label]` after the directive name becomes a paragraph child flagged
	// with data.directiveLabel — pull it out to use as the title (keeping its
	// inline formatting, e.g. code spans), else fall back to the default word.
	let titleChildren = [{ type: 'text', value: KINDS[kind] }];
	const first = node.children[0];
	if (first && first.type === 'paragraph' && first.data?.directiveLabel) {
		titleChildren = first.children;
		node.children.shift();
	}

	node.data = node.data || {};
	node.data.hName = 'aside';
	node.data.hProperties = {
		className: ['doc-aside', `doc-aside--${kind}`],
	};

	node.children.unshift({
		type: 'paragraph',
		data: {
			hName: 'p',
			hProperties: { className: ['doc-aside__title'] },
		},
		children: titleChildren,
	});
}
