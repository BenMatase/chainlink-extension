import browser from 'webextension-polyfill';
import isEqual from 'lodash/isEqual';
import {
	getOctokit,
	generateResults,
	type PrIdentifier,
	type Results,
	type PrInfo,
	stateOrder,
} from './api.js';
import {optionsStorage, type Options} from './options-storage.js';
import {load, store} from './storage.js';
import {getSvgFromPrInfo} from './render.js';

const urlRegexp = /github\.com\/([\w-.]+)\/([\w-.]+)\/pull\/(\d+)/;

function setStatus(text: string) {
	const s = document.querySelector('#status');
	if (s) s.textContent = text;
}

function makePrLink(pr: {
	title: string;
	href: string;
	number: number;
	state?: string;
}) {
	const a = document.createElement('a');
	a.href = pr.href;
	a.textContent = pr.title; // Show title only; number removed
	a.target = '_blank';
	return a;
}

// Use the main extension's SVG icons via `getSvgFromPrInfo` in `render.ts`.
function getStateIcon(state?: string): SVGElement {
	const dummy = {
		title: '',
		href: '',
		number: 0,
		state: state ?? 'unknown',
	} as unknown as PrInfo;
	// GetSvgFromPrInfo returns an SVGSVGElement
	return getSvgFromPrInfo(dummy) as unknown as SVGElement;
}

type TreeNode = {
	pr: {title: string; href: string; number: number; state?: string};
	children: TreeNode[];
};

// eslint-disable-next-line max-params
async function buildDescendantsTree(
	octokit: ReturnType<typeof getOctokit>,
	options: Options,
	prIdentifier: PrIdentifier,
	seen: Set<string>,
	forceFresh = false,
): Promise<TreeNode> {
	const key = `${prIdentifier.owner}/${prIdentifier.repo}#${prIdentifier.number}`;
	seen.add(key);

	let results: Results | undefined;

	// Try to use cached results first (mirrors main extension behaviour)
	if (!forceFresh && options.enableCache) {
		try {
			// Load() returns undefined when no cache exists
			results = await load(prIdentifier);
		} catch (error: unknown) {
			// ignore and continue to fetch fresh

			console.error('Failed to load cached results', error);
		}
	}

	if (!results) {
		// Fetch fresh and store when caching enabled

		results = await generateResults(octokit, options, prIdentifier);
		if (options.enableCache) {
			void store(prIdentifier, results).catch((error: unknown) => {
				console.error('Failed to store results in cache', error);
			});
		}
	}

	const node: TreeNode = {
		pr: {
			title: `PR ${prIdentifier.number}`,
			href: '',
			number: prIdentifier.number,
			state: undefined,
		},
		children: [],
	};

	const children: PrInfo[] = results.descendantPrs ?? [];

	// Sort by PR state priority (descending) then by PR number (ascending)
	children.sort((a, b) => {
		const stateDiff = (stateOrder[b.state] ?? 0) - (stateOrder[a.state] ?? 0);
		if (stateDiff !== 0) return stateDiff;
		// Newest PRs first (higher number first)
		return b.number - a.number;
	});

	const tasks: Array<Promise<TreeNode>> = [];
	for (const child of children) {
		const childKey = `${prIdentifier.owner}/${prIdentifier.repo}#${child.number}`;
		if (seen.has(childKey)) continue;
		const childIdentifier: PrIdentifier = {
			owner: prIdentifier.owner,
			repo: prIdentifier.repo,
			number: child.number,
		};
		const p = buildDescendantsTree(
			octokit,
			options,
			childIdentifier,
			seen,
			forceFresh,
		).then((subtree) => {
			// Attach real pr info
			subtree.pr = {
				title: child.title,
				href: child.href,
				number: child.number,
				state: child.state,
			};
			return subtree;
		});
		tasks.push(p);
	}

	if (tasks.length > 0) {
		const subtrees = await Promise.all(tasks);
		node.children.push(...subtrees);
	}

	return node;
}

function renderTree(container: HTMLElement, node: TreeNode) {
	container.innerHTML = '';
	const rootUl = document.createElement('ul');

	function renderNode(n: TreeNode, parentUl: HTMLUListElement) {
		const li = document.createElement('li');

		const row = document.createElement('div');
		row.className = 'pr-row';

		// Expand/collapse control
		if (n.children && n.children.length > 0) {
			const toggle = document.createElement('button');
			toggle.className = 'toggle';
			toggle.setAttribute('aria-expanded', 'true');
			toggle.textContent = '▾';
			row.append(toggle);

			const childUl = document.createElement('ul');
			childUl.style.display = 'block';
			toggle.addEventListener('click', () => {
				const expanded = toggle.getAttribute('aria-expanded') === 'true';
				toggle.setAttribute('aria-expanded', String(!expanded));
				toggle.textContent = expanded ? '▸' : '▾';
				childUl.style.display = expanded ? 'none' : 'block';
			});

			const icon = getStateIcon(n.pr.state);
			icon.classList.add('pr-icon');
			icon.setAttribute('title', n.pr.state ?? 'unknown');

			const a = makePrLink(n.pr);
			a.className = 'pr-link';

			const stateSpan = document.createElement('span');
			stateSpan.className = `pr-state ${n.pr.state ?? ''}`;
			stateSpan.setAttribute('aria-hidden', 'true');

			row.append(icon, a, stateSpan);

			li.append(row);

			for (const c of n.children) {
				renderNode(c, childUl);
			}

			li.append(childUl);
		} else {
			// No children: simple row
			const spacer = document.createElement('span');
			spacer.className = 'toggle empty';
			spacer.textContent = '';

			const icon = getStateIcon(n.pr.state);
			icon.classList.add('pr-icon');
			icon.setAttribute('title', n.pr.state ?? 'unknown');

			const a = makePrLink(n.pr);
			a.className = 'pr-link';

			const stateSpan = document.createElement('span');
			stateSpan.className = `pr-state ${n.pr.state ?? ''}`;
			stateSpan.setAttribute('aria-hidden', 'true');

			row.append(spacer, icon, a, stateSpan);
			li.append(row);
		}

		parentUl.append(li);
	}

	// Render children of the root node (we don't show a synthetic root)
	for (const child of node.children) {
		renderNode(child, rootUl);
	}

	container.append(rootUl);
}

async function main() {
	try {
		setStatus('Detecting active tab…');

		const tabs = await browser.tabs.query({active: true, currentWindow: true});
		const tab = tabs?.[0];
		if (!tab?.url) {
			setStatus('No active tab URL available');
			return;
		}

		const match = urlRegexp.exec(String(tab.url));
		if (!match) {
			setStatus('This popup works on GitHub pull request pages only');
			return;
		}

		const owner = match[1];
		const repo = match[2];
		const number = Number.parseInt(match[3], 10);

		setStatus('Loading options…');
		const options = await optionsStorage.getAll();

		setStatus('Connecting to GitHub…');
		const octokit = getOctokit(options.token);

		setStatus('Building descendant tree…');

		const rootIdentifier: PrIdentifier = {owner, repo, number};
		const treeContainer = document.querySelector('#tree');
		if (!treeContainer) {
			setStatus('Missing tree container');
			return;
		}

		// If caching enabled, render cached tree immediately, then fetch fresh and show update button if different
		if (options.enableCache) {
			const seen = new Set<string>();
			const cachedTree = await buildDescendantsTree(
				octokit,
				options,
				rootIdentifier,
				seen,
				false,
			);

			if (cachedTree.children.length === 0) {
				setStatus('No descendants found');
			} else {
				setStatus('');
			}

			renderTree(treeContainer, cachedTree);

			// Fetch fresh in background and offer update if there's any change
			setStatus('Refreshing…');
			const freshSeen = new Set<string>();
			const freshTree = await buildDescendantsTree(
				octokit,
				options,
				rootIdentifier,
				freshSeen,
				true,
			);

			if (isEqual(cachedTree, freshTree)) {
				setStatus('');
			} else {
				const statusElement = document.querySelector('#status');
				const button = document.createElement('button');
				button.textContent = 'Update';
				button.style.marginLeft = '8px';
				button.addEventListener('click', () => {
					renderTree(treeContainer, freshTree);
					if (statusElement) statusElement.textContent = '';
					button.remove();
				});
				// Prefer optional chaining for concise checks
				statusElement?.parentNode?.insertBefore(
					button,
					statusElement?.nextSibling ?? null,
				);
			}
		} else {
			// No cache: build fresh and render
			const seen = new Set<string>();
			const tree = await buildDescendantsTree(
				octokit,
				options,
				rootIdentifier,
				seen,
				true,
			);

			if (tree.children.length === 0) {
				setStatus('No descendants found');
			} else {
				setStatus('');
			}

			renderTree(treeContainer, tree);
		}
	} catch (error: unknown) {
		console.error(error);
		setStatus('Failed to build tree');
	}
}

void main();
