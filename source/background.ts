// eslint-disable-next-line import/no-unassigned-import
import './options-storage.js';

chrome.runtime.onInstalled.addListener(() => {
	chrome.runtime.openOptionsPage().catch((error: unknown) => {
		console.error(error);
	});
});
