import {Octokit} from '@octokit/core';
import {type Options} from './options-storage.js';

const listPrEndpoint = 'GET /repos/{owner}/{repo}/pulls';
const getPrEndpoint = 'GET /repos/{owner}/{repo}/pulls/{pull_number}';

const maxPerPage = 100;

type OctokitType = InstanceType<typeof Octokit>;

export function getOctokit(authToken: string): OctokitType {
	return new Octokit({auth: authToken});
}

type PrResponseData = {
	number: number;
	title: string;
	html_url: string;
	state: string;
	draft: boolean;
	merged_at?: string;
	head: BranchPrResponseData;
	base: BranchPrResponseData;
};

type BranchPrResponseData = {
	label: string;
	ref: string;
};

export type PrInfo = {
	title: string;
	href: string;
	state: State;
	number: number;
};

export type Results = {
	ancestorPrs: PrInfo[];
	descendantPrs: PrInfo[];
	siblingPrs: PrInfo[];
};

async function getPr(
	octokit: OctokitType,
	prIdentifier: PrIdentifier,
): Promise<PrResponseData> {
	const {data} = await octokit.request(getPrEndpoint, {
		owner: prIdentifier.owner,
		repo: prIdentifier.repo,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		pull_number: prIdentifier.number,
	});

	return data;
}

async function fetchAllPrsForRepoWithHead(
	octokit: OctokitType,
	owner: string,
	repo: string,
	head: string,
): Promise<PrResponseData[]> {
	const prs = [];
	let page = 1;
	for (;;) {
		// eslint-disable-next-line no-await-in-loop
		const prsResult = await octokit.request(listPrEndpoint, {
			owner,
			repo,
			state: 'all',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			per_page: maxPerPage,
			page,
			head,
		});

		prs.push(...prsResult.data);

		if (prsResult.data.length < maxPerPage) {
			break;
		}

		page++;
	}

	return prs;
}

async function fetchAllPrsForRepoWithBase(
	octokit: OctokitType,
	owner: string,
	repo: string,
	base: string,
): Promise<PrResponseData[]> {
	const prs = [];
	let page = 1;
	for (;;) {
		// eslint-disable-next-line no-await-in-loop
		const prsResult = await octokit.request(listPrEndpoint, {
			owner,
			repo,
			state: 'all',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			per_page: maxPerPage,
			page,
			base,
		});

		prs.push(...prsResult.data);

		if (prsResult.data.length < maxPerPage) {
			break;
		}

		page++;
	}

	return prs;
}

export type PrIdentifier = {
	owner: string;
	repo: string;
	number: number;
};

export async function generateResults(
	octokit: OctokitType,
	options: Options,
	prIdentifier: PrIdentifier,
): Promise<Results> {
	const requestedPr = await getPr(octokit, prIdentifier);

	// Base <= head
	// 0 <= 1 ancestor
	// 1 <= 2 this pr
	// 2 <= 3 descendant
	// 1 <= 4 sibling pr

	// ancestors are where their head is our base
	// descendants are where their base is our head

	const [ancestorPrs, descendantPrs, siblingPrs] = await Promise.all([
		fetchAllPrsForRepoWithHead(
			octokit,
			prIdentifier.owner,
			prIdentifier.repo,
			requestedPr.base.label,
		),
		fetchAllPrsForRepoWithBase(
			octokit,
			prIdentifier.owner,
			prIdentifier.repo,
			requestedPr.head.ref,
		),
		fetchAndFilterSibilingPrs(octokit, options, prIdentifier, requestedPr),
	]);

	return {
		ancestorPrs: getResults(ancestorPrs),
		descendantPrs: getResults(descendantPrs),
		siblingPrs: getResults(siblingPrs),
	};
}

// Convert to prinfos and then sort by number because we want them to be consistent when loading
// them from storage for comparison purposes
function getResults(prResponseData: PrResponseData[]): PrInfo[] {
	return prResponseData
		.map((x) => getInfo(x))
		.sort((a, b) => a.number - b.number);
}

async function fetchAndFilterSibilingPrs(
	octokit: OctokitType,
	options: Options,
	prIdentifier: PrIdentifier,
	requestedPr: PrResponseData,
): Promise<PrResponseData[]> {
	if (options.showSiblingPrs) {
		return fetchAllPrsForRepoWithBase(
			octokit,
			prIdentifier.owner,
			prIdentifier.repo,
			requestedPr.base.ref,
		).then((allSiblingPrs) =>
			allSiblingPrs.filter((pr) => pr.number !== requestedPr.number),
		);
	}

	return [];
}

function getInfo(prResponseData: PrResponseData): PrInfo {
	if (prResponseData === null) {
		return prResponseData;
	}

	const state = getState(prResponseData);

	return {
		title: prResponseData.title,
		href: prResponseData.html_url,
		state,
		number: prResponseData.number,
	};
}

export enum State {
	Open = 'open',
	Draft = 'draft',
	Merged = 'merged',
	Closed = 'closed',

	Unknown = 'unknown',
}

// Giving each state a priority
export const stateOrder: Record<State, number> = {
	[State.Open]: 5,
	[State.Draft]: 4,
	[State.Merged]: 3,
	[State.Closed]: 2,
	[State.Unknown]: 1,
};

function getState(prResponseData: PrResponseData): State {
	if (prResponseData.merged_at !== null) {
		return State.Merged;
	}

	if (prResponseData.draft) {
		return State.Draft;
	}

	switch (prResponseData.state) {
		case 'open': {
			return State.Open;
		}

		case 'closed': {
			return State.Closed;
		}

		default: {
			return State.Unknown;
		}
	}
}
