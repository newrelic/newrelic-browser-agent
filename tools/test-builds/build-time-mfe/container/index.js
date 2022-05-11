// import { BrowserAgent } from '@newrelic/browser-agent'

// const nrConfig = {
//     applicationID: 35094709,
//     licenseKey: '2fec6ab188',
//     beacon: 'staging-bam-cell.nr-data.net',
//     jserrors: { harvestTimeSeconds: 5 }
// }

// const nr = new BrowserAgent()

// nr.start(nrConfig).then(() => {
//     console.debug("agent initialized! -- CONTAINER!", nrConfig)

//     console.debug(`NOTICING (nr.noticeError()) an error in the container app!`)
//     nr.noticeError("nr.noticeError() called in the container app!") // call noticeError
// })

import { mount as dogsMount, unmount as dogsUnmount } from 'component-1'
import { mount as catsMount, unmount as catsUnmount } from 'component-2'

catsMount(document.querySelector("#content"))
dogsMount(document.querySelector("#content"))

document.querySelector("#dogs").addEventListener("click", () => {
    catsUnmount()
    dogsMount(document.querySelector("#content"))
})

document.querySelector("#cats").addEventListener("click", () => {
    dogsUnmount()
    catsMount(document.querySelector("#content"))
})

setTimeout(() => {
    const tbl = {}
    Object.entries(NREUM.initializedAgents).forEach(([key, values]) => {
        const autoInstrument = key === nr.id
        tbl[key] = {features: values.features.join(", ") || null, applicationID: values.info.applicationID, autoInstrument}
    })
    console.table(tbl)
}, 500)
