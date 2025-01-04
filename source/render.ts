import {type Results, type PrInfo} from './api.js';

export function renderInDiv(resultDiv: HTMLDivElement, results: Results) {
	if (resultDiv) {
		// Clear out div
		while (resultDiv.firstChild) {
			const lastChild = resultDiv.lastChild;
			if (lastChild) {
				lastChild.remove();
			}
		}

		resultDiv.style.display = 'flex';

		const ancestorDiv = document.createElement('div');
		ancestorDiv.style.width = '33.3%';

		renderHeader(ancestorDiv, 'Ancestor PRs');
		renderList(ancestorDiv, results.ancestorPrs);

		resultDiv.append(ancestorDiv);

		const siblingDiv = document.createElement('div');
		siblingDiv.style.width = '33.3%';

		renderHeader(siblingDiv, 'Sibling PRs');
		renderList(siblingDiv, results.siblingPrs);

		resultDiv.append(siblingDiv);

		const descendantDiv = document.createElement('div');
		descendantDiv.style.width = '33.3%';

		renderHeader(descendantDiv, 'Descendant PRs');
		renderList(descendantDiv, results.descendantPrs);

		resultDiv.append(descendantDiv);
	}
}

function renderHeader(div: HTMLElement, text: string) {
	const header = document.createElement('h4');
	header.textContent = text;

	div.append(header);
}

function renderList(div: HTMLElement, l: PrInfo[]) {
	if (l.length > 0) {
		const ul = document.createElement('ul');

		// Sort by state (open vs closed, etc), then by title
		l.sort((a, b) => {
			const statesCompare = b.state.localeCompare(a.state);
			if (statesCompare !== 0) {
				return statesCompare;
			}

			return b.title.localeCompare(a.title);
		});

		for (const pr of l) {
			const li = document.createElement('li');
			li.style.display = 'flex'; // Enables side by side

			const svgElement = getSvgFromPrInfo(pr);
			const svgDiv = document.createElement('div');
			svgDiv.append(svgElement);
			svgDiv.style.flexShrink = '0'; // Don't shrink
			svgDiv.style.marginRight = '5px'; // Give some space
			li.append(svgDiv);

			const a = document.createElement('a');

			a.textContent = `${pr.title}`;
			a.href = pr.href;

			li.append(a);

			ul.append(li);
		}

		div.append(ul);
	} else {
		addNone(div);
	}
}

function addNone(div: HTMLElement) {
	const p = document.createElement('p');
	p.textContent = 'None';
	div.append(p);
}

// I didn't want to have them copied, but the octicons package either can't
// tree-shake out the unused ones or I'm not smart enough to figure out how
// I also tried the css way with spans but that seems deprecated
const openSvgPathData =
	'M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z';
const closedSvgPathData =
	'M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 5.5a.75.75 0 0 1 .75.75v3.378a2.251 2.251 0 1 1-1.5 0V7.25a.75.75 0 0 1 .75-.75Zm-2.03-5.273a.75.75 0 0 1 1.06 0l.97.97.97-.97a.748.748 0 0 1 1.265.332.75.75 0 0 1-.205.729l-.97.97.97.97a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-.97-.97-.97.97a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l.97-.97-.97-.97a.75.75 0 0 1 0-1.06ZM2.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM3.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm9.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z';
const draftSvgPathData =
	'M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 14a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5ZM2.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM3.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm9.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM14 7.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm0-4.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z';

const svgNamespace = 'http://www.w3.org/2000/svg';

function getSvgFromPrInfo(prInfo: PrInfo): SVGSVGElement {
	const svgElement = document.createElementNS(svgNamespace, 'svg');
	svgElement.setAttribute('height', '16');
	svgElement.setAttribute('width', '16');
	const svgPathElement = document.createElementNS(svgNamespace, 'path');

	svgElement.append(svgPathElement);

	if (prInfo.isDraft) {
		svgElement.setAttribute('class', 'octicon octicon-git-pull-request-draft');
		svgPathElement.setAttribute('d', draftSvgPathData);
		return svgElement;
	}

	switch (prInfo.state) {
		case 'open': {
			svgElement.setAttribute(
				'class',
				'octicon octicon-git-pull-request color-fg-open',
			);
			svgPathElement.setAttribute('d', openSvgPathData);
			return svgElement;
		}

		case 'closed': {
			svgElement.setAttribute(
				'class',
				'octicon octicon-git-pull-request-closed closed',
			);
			svgPathElement.setAttribute('d', closedSvgPathData);
			return svgElement;
		}

		default: {
			svgElement.setAttribute('class', 'octicon octicon-question');
			return svgElement;
		}
	}
}
