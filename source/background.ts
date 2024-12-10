// eslint-disable-next-line import/no-unassigned-import
import './options-storage.js';
import welcomeHtml from './welcome.html';

const welcomeHtmlUrl = welcomeHtml as string;

chrome.runtime.onInstalled.addListener(() => {
	chrome.tabs
		.create({
			url: welcomeHtmlUrl,
		})
		.catch((error: unknown) => {
			console.error(error);
		});
});
