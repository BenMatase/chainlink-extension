import {getIconByName} from '@primer/octicons';
import {type Results, type PrInfo} from './api.js';

openPrIcon = getIconByName('git-pull-request');
closedPrIcon = getIconByName('git-pull-request-closed');
draftPrIcon = getIconByName('git-pull-request-draft');
questionIcon = getIconByName('question');

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

			const svgDiv = document.createElement('div');
			const svgHtml = getSvgHtmlFromPrInfo(pr);
			svgDiv.innerHTML = svgHtml;
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

function getSvgHtmlFromPrInfo(prInfo: PrInfo): string {
	if (prInfo.isDraft) {
		return draftPrIcon.toSVG();
	}

	switch (prInfo.state) {
		case 'open': {
			return openPrIcon.toSVG({
				class: 'octicon octicon-git-pull-request color-fg-open',
			});
		}

		case 'closed': {
			return closedPrIcon.toSVG({
				class: 'octicon octicon-git-pull-request-closed closed',
			});
		}

		default: {
			return questionIcon.toSVG();
		}
	}
}
