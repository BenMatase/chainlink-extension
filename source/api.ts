import { rawListeners } from "process";

const { Octokit } = require("@octokit/core")

const listPrEndpoint = 'GET /repos/{owner}/{repo}/pulls'
const getPrEndpoint = 'GET /repos/{owner}/{repo}/pulls/{pull_number}'

type OctokitType = InstanceType<typeof Octokit>

export function getOctokit(authToken: string) : OctokitType {
    return new Octokit({ auth: authToken })
}

async function getPR(octokit: OctokitType, owner: string, repo: string, pull_number: Number) {
    return (await octokit.request( getPrEndpoint, {
        owner: owner,
        repo: repo,
        pull_number: pull_number
    })).data
}

// TODO: refactor these when I understand how ts/js does conditional params
async function fetchAllPRsForRepo(octokit: OctokitType, owner: string, repo: string) {
    const prs = []
    let page = 1
    while (true) {
        const prsResult = await octokit.request(listPrEndpoint, {
            owner: owner,
            repo: repo,
            state: 'open',
            per_page: 100,
            page: page,
        })

        if (prsResult.data.length === 0) break
        prs.push(...prsResult.data)
        page++
    }
    return prs
}

async function fetchAllPRsForRepoWithHead(octokit: OctokitType, owner: string, repo: string, head: string) {
    const prs = []
    let page = 1
    while (true) {
        const prsResult = await octokit.request(listPrEndpoint, {
            owner: owner,
            repo: repo,
            state: 'open',
            per_page: 100,
            page: page,
            head: head,
        })

        if (prsResult.data.length === 0) break
        prs.push(...prsResult.data)
        page++
    }
    return prs
}

async function fetchAllPRsForRepoWithBase(octokit: OctokitType, owner: string, repo: string, base: string) {
    const prs = []
    let page = 1
    while (true) {
        const prsResult = await octokit.request(listPrEndpoint, {
            owner: owner,
            repo: repo,
            state: 'open',
            per_page: 100,
            page: page,
            base: base,
        })

        if (prsResult.data.length === 0) break
        prs.push(...prsResult.data)
        page++
    }
    return prs
}

export async function generateResults(octokit: OctokitType, owner: string, repo: string, prNum: number, useCpuHeavy: boolean = false) {
    let ancestorPrs = new Array<any>()
    let descendantPrs = new Array<any>()
    let requestedPr: any

    if (!useCpuHeavy) {
        const requestedPr = await getPR(octokit, owner, repo, prNum)

        // base <= head
        // 0 <= 1 ancestor
        // 1 <= 2 this pr
        // 2 <= 3 descendant

        // ancestors are where their head is our base
        // descendants are where their base is our head

        // console.log("requested PR")
        // console.log(requestedPr)

        // TODO: do these queries in parallel
        ancestorPrs = await fetchAllPRsForRepoWithHead(octokit, owner, repo, requestedPr.base.label)
        descendantPrs = await fetchAllPRsForRepoWithBase(octokit, owner, repo, requestedPr.head.ref) // base arg is just the branch name
    } else {
        [ancestorPrs, descendantPrs] = await generateCpuHeavyResults(octokit, owner, repo, prNum)

    }

    // console.log(ancestorPrs)
    // console.log(descendantPrs)

    return {
        "ancestorPRs": ancestorPrs.map((x) => {return getInfo(x);}),
        "descendantPRs": descendantPrs.map((x) => {return getInfo(x);}),
        "requestedPR": requestedPr
    }
}

async function generateCpuHeavyResults(octokit: OctokitType, owner: string, repo: string, prNum: number) {
    const prs = await fetchAllPRsForRepo(octokit, owner, repo)

    let branchToPr = new Map<string, Set<string>>()
    let targetBranchToBranches = new Map<string, Set<string>>()

    let targetBranchOfThisPr = null
    let branchOfThisPr = null

    prs.forEach((pr) => {
        let prBranch = pr.head.label
        let targetBranch = pr.base.label
        if (pr["number"] == prNum) {
            // TODO: use label which has org for cross org PR finding?
            targetBranchOfThisPr = targetBranch
            branchOfThisPr = prBranch
        }

        setWithCreation(branchToPr, prBranch, pr)

        setWithCreation(targetBranchToBranches, targetBranch, prBranch)
    })

    if (targetBranchOfThisPr == null) { throw new Error("failed to find target branch of this pr") }
    if (branchOfThisPr == null) { throw new Error("failed to find branch of this pr") }

    // empty set indicates that the branch that it is targetting does not have a PR
    let ancestorPrs = new Array()
    if (branchToPr.has(targetBranchOfThisPr)) {
        let prSet = branchToPr.get(targetBranchOfThisPr)
        if (prSet) {
            ancestorPrs = Array.from(prSet)
        }
    }

    let descendantPrs = new Array()
    if (targetBranchToBranches.has(branchOfThisPr)) {
        let branchSet = targetBranchToBranches.get(branchOfThisPr)
        if (!branchSet) {
            throw new Error("programmer error!!")
        }

        branchSet.forEach((branch: string) => {
            let prSet = branchToPr.get(branch)
            if (prSet && prSet.size > 0) {
                let prArray = Array.from(prSet)
                descendantPrs.push(...prArray)
            }
        })
    }

    return [ancestorPrs, descendantPrs]
}

// TODO: make the set's any and value any the same by enforcement?
function setWithCreation(map: Map<any, Set<any>>, key: any, value: any) {
    if (!map.has(key)) {
        map.set(key, new Set())
    }
    let keySet = map.get(key)
    if (!keySet) {
        // IMPOSSIBLE
        throw new Error("programmer error!")
    }
    keySet.add(value)
}

function getInfo(pr: any) : any {
    if (pr == null) {
        return pr
    }

    return {
        "title": pr["title"],
        "href": pr["html_url"],
        "state": pr["state"]
    }
}
