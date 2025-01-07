import {Octokit} from '@octokit/core';

const listPrEndpoint = 'GET /repos/{owner}/{repo}/pulls';
const getPrEndpoint = 'GET /repos/{owner}/{repo}/pulls/{pull_number}';

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
	requestedPr: any;
};

async function getPr(
	octokit: OctokitType,
	owner: string,
	repo: string,
	pullNumber: number,
): Promise<PrResponseData> {
	const {data} = await octokit.request(getPrEndpoint, {
		owner,
		repo,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		pull_number: pullNumber,
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
	while (page > 0) {
		// eslint-disable-next-line no-await-in-loop
		const prsResult = await octokit.request(listPrEndpoint, {
			owner,
			repo,
			state: 'all',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			per_page: 100,
			page,
			head,
		});

		if (prsResult.data.length === 0) {
			page = 0;
			break;
		}

		prs.push(...prsResult.data);
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
	while (page > 0) {
		// eslint-disable-next-line no-await-in-loop
		const prsResult = await octokit.request(listPrEndpoint, {
			owner,
			repo,
			state: 'all',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			per_page: 100,
			page,
			base,
		});

		if (prsResult.data.length === 0) {
			page = 0;
			break;
		}

		prs.push(...prsResult.data);
		page++;
	}

	return prs;
}

export async function generateResults(
	octokit: OctokitType,
	owner: string,
	repo: string,
	prNumber: number,
): Promise<Results> {
	const requestedPr = await getPr(octokit, owner, repo, prNumber);

	// Base <= head
	// 0 <= 1 ancestor
	// 1 <= 2 this pr
	// 2 <= 3 descendant
	// 1 <= 4 sibling pr

	// ancestors are where their head is our base
	// descendants are where their base is our head

	const [ancestorPrs, descendantPrs, allSiblingPrs] = await Promise.all([
		fetchAllPrsForRepoWithHead(octokit, owner, repo, requestedPr.base.label),
		fetchAllPrsForRepoWithBase(octokit, owner, repo, requestedPr.head.ref),
		fetchAllPrsForRepoWithBase(octokit, owner, repo, requestedPr.base.ref),
	]);

	const siblingPrs = allSiblingPrs.filter((pr) => pr.number !== prNumber);

	return {
		ancestorPrs: ancestorPrs.map((x) => getInfo(x)),
		descendantPrs: descendantPrs.map((x) => getInfo(x)),
		siblingPrs: siblingPrs.map((x) => getInfo(x)),
		requestedPr,
	};
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
