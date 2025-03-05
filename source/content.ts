import browser from 'webextension-polyfill';
import {optionsStorage, type Options} from './options-storage.js';
import {generateResults, getOctokit, type Results} from './api.js';
import {renderInDiv} from './render.js';

console.log('💈 Content script loaded for', browser.runtime.getManifest().name);

const urlRegexp = /github\.com\/([\w-.]+)\/([\w-.]+)\/pull\/(\d+)/;
const chainlinkAddedId = 'chainlink-added';
const chainlinkAddedIdSelector = `#${chainlinkAddedId}`;

async function addContent(url: string, parentDiv: HTMLDivElement) {
	const match = urlRegexp.exec(url);

	if (match === null) {
		console.log('chainlink does not care about this page, skipping');
		return;
	}

	if (match.length !== 4) {
		console.error(
			`got invalid number (${match.length}) of matches: ${match.toString()}`,
		);
		return;
	}

	const options = await optionsStorage.getAll();

	const owner = match[1];
	const repo = match[2];
	const pullNumber = Number.parseInt(match[3], 10);

	// TODO: make sure token is populated
	const octokit = getOctokit(options.token);

	const resultDiv = prepopulateTheResultDiv(parentDiv);
	if (resultDiv === undefined) {
		return;
	}

	generateResults(octokit, options, {owner, repo, number: pullNumber})
		.then((data: Results) => {
			renderInDiv(options, resultDiv, data);
		})
		.catch((error: unknown) => {
			console.error(error);
		});
}

function prepopulateTheResultDiv(
	parentDiv: HTMLDivElement,
): HTMLDivElement | undefined {
	const oldResultDiv = document.body.querySelector(chainlinkAddedIdSelector);

	const alreadyRan = oldResultDiv !== null;
	if (alreadyRan) {
		console.log(
			'seems like extension has already ran on this page, returning existing',
		);
		return oldResultDiv;
	}

	const resultDiv = document.createElement('div');
	resultDiv.id = chainlinkAddedId;
	resultDiv.style.height = '110px';
	parentDiv.append(resultDiv);

	return resultDiv;
}

type ObserverListener<ExpectedElement extends HTMLDivElement> = (
	element: ExpectedElement,
) => void;

const animation = 'chainlink-selector-observer';

// May need to limit this to one call per page, but for now, it's fine
const registerAnimation = (): void => {
	document.head.append('<style>{`@keyframes ${animation} {}`}</style>');
};

async function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
}

export default function observe<Selector extends string>(
	selectors: Selector | readonly Selector[],
	listener: ObserverListener<HTMLDivElement>,
): void {
	const selector =
		typeof selectors === 'string' ? selectors : selectors.join(',\n');
	const seenMark = 'chainlink-seen';

	registerAnimation();

	const rule = document.createElement('style');
	rule.textContent = `
  		@keyframes chainlink-selector-observer {}
		${String(selector)}:not(.${seenMark}) {
			animation: 1ms ${animation};
		}
	`;
	document.body.prepend(rule);

	let called = false;
	(async () => {
		await delay(1000);
		if (!called) {
			console.warn('Chainlink Selector not found on page:', selector);
		}
	})();

	globalThis.addEventListener('animationstart', (event: AnimationEvent) => {
		const target = event.target as HTMLElement;
		if (target.classList.contains(seenMark) || !target.matches(selector)) {
			return;
		}

		called = true;
		target.classList.add(seenMark);
		listener(target);
	});
}

observe('#partial-discussion-header', (element) => {
	addContent(window.location.href, element).catch((error: unknown) => {
		console.error(error);
	});
});
