import browser from 'webextension-polyfill';
import optionsStorage from './options-storage.js';
import {generateResults, getOctokit, type Results} from './api.js';
import {renderInDiv} from './render.js';

console.log('💈 Content script loaded for', browser.runtime.getManifest().name);

const urlRegexp = /github\.com\/([\w-.]+)\/([\w-.]+)\/pull\/(\d+)/g;
const chainlinkAddedId = 'chainlink-added';
const chainlinkAddedIdSelector = `#${chainlinkAddedId}`;

async function addContent(url: string) {
	const options = await optionsStorage.getAll();

	const matches = url.matchAll(urlRegexp);
	const matchesArray = Array.from(matches)[0];

	if (matchesArray.length !== 4) {
		console.error(
			`got invalid number (${matchesArray.length}) of matches: ${matchesArray.toString()}`,
		);
	}

	const owner = matchesArray[1];
	const repo = matchesArray[2];
	const pullNumber = Number.parseInt(matchesArray[3], 10);

	// TODO: make sure token is populated
	const octokit = getOctokit(options.token);

	generateResults(octokit, owner, repo, pullNumber)
		.then((data: Results) => {
			findAndRender(data);
		})
		.catch((error: unknown) => {
			console.error(error);
		});
}

function findAndRender(data: Results) {
	// TODO: this is a hack, since the script is watching on so many observers,
	// this will fire before the old page will render, so the div is already there.
	// By putting it here, it is delayed enough to work properly
	const alreadyRan =
		document.body.querySelector(chainlinkAddedIdSelector) !== null;
	if (alreadyRan) {
		console.log(
			'seems like extension has already ran on this page, skipping...',
		);
		return;
	}

	const parentDiv = document.querySelector('#partial-discussion-header');
	if (parentDiv === null) {
		console.error('failed to find parent div');
		return;
	}

	const resultDiv = document.createElement('div');
	resultDiv.id = chainlinkAddedId;
	parentDiv.append(resultDiv);

	renderInDiv(resultDiv, data);
}

let previousUrl = '';
const observer = new MutationObserver(function (mutations) {
	if (location.href !== previousUrl) {
		previousUrl = location.href;

		console.log(
			`URL changed to ${location.href}, triggering chainlink content script`,
		);
		addContent(location.href).catch((error: unknown) => {
			console.error(error);
		});
	}
});

// I tried to have this observer on less things, such as the request-id meta tag, but
// since github does a lot of churn on the elements, best I could figure out is to watch
// everything that changes in head and then make sure the logic only triggers once.
const config = {subtree: true, childList: true};
observer.observe(document.head, config);
