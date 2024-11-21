
export function renderInDiv(resultDiv: any, result: any) {
    if (resultDiv) {
        // clear out div
        while (resultDiv.firstChild) {
            const lastChild = resultDiv.lastChild
            if (lastChild) {
                resultDiv.removeChild(lastChild)
            }
        }

        const h3a = document.createElement('h4')
        h3a.textContent = "Ancestor PRs"
        resultDiv.appendChild(h3a)

        renderList(resultDiv, result.ancestorPRs)

        const h3d = document.createElement('h4')
        h3d.textContent = "Descendant PRs"
        resultDiv.appendChild(h3d)

        renderList(resultDiv, result.descendantPRs)
    }
}

function renderList(div: HTMLElement, l: Array<any>) {
    if (l.length > 0) {
        const ul = document.createElement('ul')

        // sort by state (open vs closed, etc), then by title
        l.sort((a, b) => {
            let statesCompare = b.state.localeCompare(a.state)
            if (statesCompare !== 0) {
                return statesCompare
            }

            return b.title.localeCompare(a.title)
        })

        l.forEach((pr:any) => {
            const li = document.createElement('li')

            const a = document.createElement('a')

            a.textContent = "(" + pr.state + ") " + pr.title
            a.href = pr.href

            li.appendChild(a)

            ul.appendChild(li)
        })

        div.appendChild(ul)
    } else {
        addNone(div)
    }
}

function addNone(div: HTMLElement) {
    const p = document.createElement('p')
    p.textContent = "None"
    div.appendChild(p)
}
