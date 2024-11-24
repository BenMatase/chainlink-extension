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

		const h3a = document.createElement('h4');
		h3a.textContent = 'Ancestor PRs';
		resultDiv.append(h3a);

		renderList(resultDiv, results.ancestorPrs);

		const h3d = document.createElement('h4');
		h3d.textContent = 'Descendant PRs';
		resultDiv.append(h3d);

		renderList(resultDiv, results.descendantPrs);
	}
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

			const a = document.createElement('a');

			a.textContent = `(${pr.state}) ${pr.title}`;
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
