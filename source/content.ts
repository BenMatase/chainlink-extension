import optionsStorage from './options-storage.js';

import { generateResults, getOctokit } from "./api"
import { renderInDiv } from "./render"

import browser from "webextension-polyfill";


console.log('💈 Content script loaded for', browser.runtime.getManifest().name);

const urlRegexp = /github\.com\/([\w-\.]+)\/([\w-\.]+)\/pull\/(\d+)/g;

async function init() {
	const options = await optionsStorage.getAll();

	let url = window.location.href

	let matches = url.matchAll(urlRegexp)
	let matchesArr = Array.from(matches)[0]

	if (matchesArr.length != 4) {
		console.error(`got invalid number of matches: ${matchesArr}`)
	}
	const owner = matchesArr[1]
	const repo = matchesArr[2]
	const pullNum = parseInt(matchesArr[3])

	// TODO: make sure token is populated
	const octokit = getOctokit(options.token)

	generateResults(octokit, owner, repo, pullNum)
		.then(data => {
			console.log(data)
			findAndRender(data)
		})
		.catch(err => {console.error(err)})



	// TODO: largest problem is now that links will now have it rerender

}

function findAndRender(data: any) {
    let parentDiv = document.getElementById("partial-discussion-header")
    if (parentDiv == null) {
        console.log("failed to find parent div")
        return
    }

    const resultDiv = document.createElement("div")
    parentDiv.appendChild(resultDiv)

    renderInDiv(resultDiv, data)
}

init();
