import {Octokit} from '@octokit/core';

const listPrEndpoint = 'GET /repos/{owner}/{repo}/pulls';
const getPrEndpoint = 'GET /repos/{owner}/{repo}/pulls/{pull_number}';

type OctokitType = InstanceType<typeof Octokit>;

export function getOctokit(authToken: string): OctokitType {
	return new Octokit({auth: authToken});
}

type PrResponseData = {
	title: string;
	html_url: string;
	state: string;
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
	state: string;
};

export type Results = {
	ancestorPrs: PrInfo[];
	descendantPrs: PrInfo[];
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

	// ancestors are where their head is our base
	// descendants are where their base is our head

	const [ancestorPrs, descendantPrs] = await Promise.all([
		fetchAllPrsForRepoWithHead(octokit, owner, repo, requestedPr.base.label),
		fetchAllPrsForRepoWithBase(octokit, owner, repo, requestedPr.head.ref),
	]);

	return {
		ancestorPrs: ancestorPrs.map((x) => getInfo(x)),
		descendantPrs: descendantPrs.map((x) => getInfo(x)),
		requestedPr,
	};
}

function getInfo(prResponseData: PrResponseData): PrInfo {
	if (prResponseData === null) {
		return prResponseData;
	}

	return {
		title: prResponseData.title,
		href: prResponseData.html_url,
		state: prResponseData.state,
	};
}
