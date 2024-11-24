import browser from 'webextension-polyfill';
import optionsStorage from './options-storage.js';
import {generateResults, getOctokit, type Results} from './api.js';
import {renderInDiv} from './render.js';

console.log('💈 Content script loaded for', browser.runtime.getManifest().name);

const urlRegexp = /github\.com\/([\w-.]+)\/([\w-.]+)\/pull\/(\d+)/g;

async function init() {
	const options = await optionsStorage.getAll();

	const url = window.location.href;

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
			console.log(data);
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
		console.log('failed to find parent div');
		return;
	}

	const resultDiv = document.createElement('div');
	parentDiv.append(resultDiv);

	renderInDiv(resultDiv, data);
}

init().catch((error: unknown) => {
	console.error(error);
});
