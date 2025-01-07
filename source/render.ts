import {type Results, type PrInfo, State, stateOrder} from './api.js';

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

		ul.style.maxHeight = '110px'; // Room for 5
		ul.style.overflowY = 'auto'; // Scrolls

		// Sort by state (open vs closed, etc), then by number
		l.sort((a, b) => {
			const statesCompare = stateOrder[b.state] - stateOrder[a.state];
			if (statesCompare !== 0) {
				return statesCompare;
			}

			return a.number - b.number;
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
const mergedSvgPathData =
	'M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0 0 .005V3.25Z';
const unknownSvgPathData =
	'M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z';

const openClasses = 'octicon octicon-git-pull-request color-fg-open';
const closedClasses = 'octicon octicon-git-pull-request-closed closed';
const draftClasses = 'octicon octicon-git-pull-request-draft';
const mergedClasses = 'octicon octicon-git-merge color-fg-done';
const unknownClasses = '';

type StateDisplayInfo = {
	svgPathData: string;
	classes: string;
};

const stateDisplayMap: Record<State, StateDisplayInfo> = {
	[State.Open]: {
		svgPathData: openSvgPathData,
		classes: openClasses,
	},
	[State.Closed]: {
		svgPathData: closedSvgPathData,
		classes: closedClasses,
	},
	[State.Draft]: {
		svgPathData: draftSvgPathData,
		classes: draftClasses,
	},
	[State.Merged]: {
		svgPathData: mergedSvgPathData,
		classes: mergedClasses,
	},
	[State.Unknown]: {
		svgPathData: unknownSvgPathData,
		classes: unknownClasses,
	},
} as const;

const svgNamespace = 'http://www.w3.org/2000/svg';

function getSvgFromPrInfo(prInfo: PrInfo): SVGSVGElement {
	const svgElement = document.createElementNS(svgNamespace, 'svg');
	svgElement.setAttribute('height', '16');
	svgElement.setAttribute('width', '16');
	const svgPathElement = document.createElementNS(svgNamespace, 'path');

	svgElement.append(svgPathElement);
	const stateDisplayInfo = stateDisplayMap[prInfo.state];

	svgElement.setAttribute('class', stateDisplayInfo.classes);
	svgPathElement.setAttribute('d', stateDisplayInfo.svgPathData);
	return svgElement;
}
