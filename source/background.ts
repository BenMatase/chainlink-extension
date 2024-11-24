import type Manifest from 'webextension-manifest';
// eslint-disable-next-line import/no-unassigned-import
import './options-storage.js';

const perTabIdLastUrl = {};

// This is needed because github is doing some slippery things where the content script
// isn't loaded on link clicks due to SPA. This code listens to those sort of
// navigations and runs the content script once per url per tab
chrome.webNavigation.onHistoryStateUpdated.addListener(
	(details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) => {
		console.log(
			`Detected navigation in SPA on tab ${details.tabId} for url ${details.url}`,
		);
		if (
			details.tabId in perTabIdLastUrl &&
			perTabIdLastUrl[details.tabId] === details.url
		) {
			console.log('doing nothing since this is an extra event');
			return;
		}

		perTabIdLastUrl[details.tabId] = details.url;

		fetch('./manifest.json')
			.then(async (response) => response.json())
			.then((manifest: Manifest) => {
				const hashedJsFile = manifest.content_scripts[0].js[0];

				chrome.scripting
					.executeScript({
						target: {tabId: details.tabId},
						files: [hashedJsFile],
					})
					.catch((error: unknown) => {
						console.error(error);
					});
			})
			.catch((error: unknown) => {
				console.error(error);
			});
	},
);
