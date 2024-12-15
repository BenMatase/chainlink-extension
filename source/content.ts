import browser from 'webextension-polyfill';
import optionsStorage from './options-storage.js';
import {generateResults, getOctokit, type Results} from './api.js';
import {renderInDiv} from './render.js';

console.log('💈 Content script loaded for', browser.runtime.getManifest().name);

const urlRegexp = /github\.com\/([\w-.]+)\/([\w-.]+)\/pull\/(\d+)/g;
const chainlinkAddedId = 'chainlink-added';

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

	// TODO: largest problem is now that links will now have it rerender
}

function findAndRender(data: Results) {
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
